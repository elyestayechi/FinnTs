import json
import sqlite3
from pathlib import Path
from datetime import datetime
import re
import time
import logging
from sqlalchemy.orm import Session
from Backend.database import get_db, engine, SessionLocal
from Backend import models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_loan_id_from_pdf(filename):
    """Extract loan ID from PDF filename with multiple patterns"""
    patterns = [
        r'loan_assessment_(\d+)_\d+\.pdf',  # loan_assessment_12345_20250101.pdf
        r'loan_assessment_(\d+)\.pdf',      # loan_assessment_12345.pdf
        r'_(\d+)_\d+\.pdf',                 # anything_12345_20250101.pdf
        r'loan_assessment_(\d+)_\d{8}_\d{6}\.pdf',  # loan_assessment_12345_20250101_120000.pdf
    ]
    
    for pattern in patterns:
        match = re.search(pattern, filename)
        if match:
            return match.group(1)
    
    return None

def migrate_pdf_reports():
    """Migrate PDF reports to database"""
    pdf_dir = Path("./PDF Loans")
    pdf_count = 0
    
    if not pdf_dir.exists():
        logger.info("PDF Loans directory does not exist - skipping PDF migration")
        return
    
    db = SessionLocal()
    
    try:
        pdf_files = list(pdf_dir.glob("*.pdf"))
        logger.info(f"Found {len(pdf_files)} PDF files to migrate")
        
        for pdf_file in pdf_files:
            if not pdf_file.is_file():
                continue
                
            loan_id = extract_loan_id_from_pdf(pdf_file.name)
            
            if not loan_id:
                logger.warning(f"Could not extract loan ID from: {pdf_file.name}")
                continue
            
            # Check if PDF already exists in database
            existing_pdf = db.query(models.PDFReport).filter(
                models.PDFReport.file_name == pdf_file.name
            ).first()
            
            if existing_pdf:
                logger.info(f"PDF already exists in database: {pdf_file.name}")
                continue
            
            # Check if loan exists, if not create it
            loan = db.query(models.Loan).filter(
                models.Loan.loan_id == loan_id
            ).first()
            
            if not loan:
                # Create a minimal loan record
                loan = models.Loan(
                    loan_id=loan_id,
                    customer_name=f"Customer {loan_id}",
                    loan_amount=0.0,
                    currency="TND",
                    status="completed"
                )
                db.add(loan)
                db.commit()
                db.refresh(loan)
                logger.info(f"Created new loan record: {loan_id}")
            
            # Create PDF report entry
            pdf_report = models.PDFReport(
                loan_id=loan_id,
                file_name=pdf_file.name,
                file_path=str(pdf_file),
                file_size=pdf_file.stat().st_size,
                generated_at=datetime.fromtimestamp(pdf_file.stat().st_mtime)
            )
            
            db.add(pdf_report)
            pdf_count += 1
            
            if pdf_count % 10 == 0:  # Commit every 10 records
                db.commit()
                logger.info(f"Migrated {pdf_count} PDFs so far...")
        
        db.commit()
        logger.info(f"Successfully migrated {pdf_count} PDF reports")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error migrating PDF reports: {str(e)}")
        raise
    finally:
        db.close()

def migrate_feedback_data():
    """Migrate feedback data from JSON file to database"""
    feedback_file = Path("./Data/feedback_db.json")
    feedback_count = 0
    
    if not feedback_file.exists():
        logger.info("No feedback database file found")
        return
    
    db = SessionLocal()
    
    try:
        with open(feedback_file, 'r', encoding='utf-8') as f:
            feedback_data = json.load(f)
        
        logger.info(f"Found {len(feedback_data.get('feedback_entries', []))} feedback entries to migrate")
        
        for entry in feedback_data.get('feedback_entries', []):
            feedback = entry.get('feedback', {})
            loan_id = feedback.get('loan_id')
            
            if not loan_id:
                continue
            
            # Check if feedback already exists
            existing_feedback = db.query(models.Feedback).filter(
                models.Feedback.loan_id == loan_id
            ).first()
            
            if existing_feedback:
                logger.info(f"Feedback already exists for loan: {loan_id}")
                continue
            
            # Check if loan exists, if not create it
            loan = db.query(models.Loan).filter(
                models.Loan.loan_id == loan_id
            ).first()
            
            if not loan:
                # Create a minimal loan record
                loan = models.Loan(
                    loan_id=loan_id,
                    customer_name=f"Customer {loan_id}",
                    loan_amount=0.0,
                    currency="TND",
                    status="completed"
                )
                db.add(loan)
                db.commit()
                db.refresh(loan)
                logger.info(f"Created new loan record for feedback: {loan_id}")
            
            # Parse timestamp
            timestamp_str = feedback.get('timestamp')
            try:
                if timestamp_str:
                    created_at = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                else:
                    created_at = datetime.now()
            except (ValueError, AttributeError):
                created_at = datetime.now()
            
            # Create feedback entry
            feedback_entry = models.Feedback(
                loan_id=loan_id,
                analyst_id=feedback.get('analyst_id', 'web_user'),
                agent_recommendation=feedback.get('agent_recommendation', 'review'),
                human_decision=feedback.get('human_decision', 'review'),
                rating=feedback.get('rating', 3),
                comments=feedback.get('comments', ''),
                created_at=created_at
            )
            
            db.add(feedback_entry)
            feedback_count += 1
            
            if feedback_count % 5 == 0:  # Commit every 5 records
                db.commit()
                logger.info(f"Migrated {feedback_count} feedback entries so far...")
        
        db.commit()
        logger.info(f"Successfully migrated {feedback_count} feedback entries")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error migrating feedback data: {str(e)}")
        raise
    finally:
        db.close()

def migrate_analyses_from_pdfs():
    """Create analysis records by extracting data from PDF files"""
    db = SessionLocal()
    analysis_count = 0
    
    try:
        # Get all PDF reports
        pdf_reports = db.query(models.PDFReport).all()
        logger.info(f"Found {len(pdf_reports)} PDF reports to create analyses from")
        
        for pdf_report in pdf_reports:
            # Check if analysis already exists
            existing_analysis = db.query(models.Analysis).filter(
                models.Analysis.loan_id == pdf_report.loan_id
            ).first()
            
            if existing_analysis:
                logger.info(f"Analysis already exists for loan: {pdf_report.loan_id}")
                continue
            
            # Try to extract analysis data from PDF
            try:
                from pypdf import PdfReader
                import re
                
                pdf_path = Path(pdf_report.file_path)
                if not pdf_path.exists():
                    logger.warning(f"PDF file not found: {pdf_path}")
                    continue
                
                with pdf_path.open('rb') as f:
                    reader = PdfReader(f)
                    text = "\n".join(page.extract_text() or '' for page in reader.pages)
                
                # Extract data from PDF text
                risk_score_match = re.search(r"TOTAL RISK SCORE: (\d+\.?\d*)", text)
                recommendation_match = re.search(r"RECOMMENDATION: (\w+)", text, re.IGNORECASE)
                
                risk_score = float(risk_score_match.group(1)) if risk_score_match else 0.0
                decision = recommendation_match.group(1).lower() if recommendation_match else "review"
                
                # Generate unique analysis ID with microsecond precision
                unique_id = f"analysis_{pdf_report.loan_id}_{int(time.time() * 1000)}"
                
                # Create analysis record
                analysis = models.Analysis(
                    analysis_id=unique_id,
                    loan_id=pdf_report.loan_id,
                    risk_score=risk_score,
                    decision=decision,
                    summary=f"Auto-extracted from PDF for loan {pdf_report.loan_id}",
                    key_findings=json.dumps(["Auto-generated from existing PDF"]),
                    conditions=json.dumps([]),
                    processing_time=0.0,
                    confidence=75.0,
                    created_at=pdf_report.generated_at or datetime.now()
                )
                
                db.add(analysis)
                analysis_count += 1
                
                # Commit after each analysis to avoid transaction issues
                db.commit()
                logger.info(f"Created analysis record for loan: {pdf_report.loan_id}")
                    
            except Exception as e:
                logger.error(f"Error processing PDF {pdf_report.file_name}: {str(e)}")
                db.rollback()  # Rollback on error to continue with next PDF
                continue
        
        logger.info(f"Successfully created {analysis_count} analysis records from PDFs")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error migrating analysis data: {str(e)}")
        raise
    finally:
        db.close()

def create_sample_data():
    """Create sample data if no data exists"""
    db = SessionLocal()
    
    try:
        # Check if we have any data
        loan_count = db.query(models.Loan).count()
        analysis_count = db.query(models.Analysis).count()
        pdf_count = db.query(models.PDFReport).count()
        
        if loan_count == 0 and analysis_count == 0 and pdf_count == 0:
            logger.info("No data found - creating sample data")
            
            # Create a sample loan
            sample_loan = models.Loan(
                loan_id="SAMPLE_001",
                customer_name="Sample Customer",
                loan_amount=50000.0,
                currency="TND",
                status="completed"
            )
            db.add(sample_loan)
            
            # Create sample analysis
            sample_analysis = models.Analysis(
                analysis_id="sample_analysis_001",
                loan_id="SAMPLE_001",
                risk_score=45.5,
                decision="review",
                summary="Sample analysis for demonstration",
                key_findings=json.dumps(["Sample finding 1", "Sample finding 2"]),
                conditions=json.dumps(["Condition 1", "Condition 2"]),
                processing_time=30.5,
                confidence=85.0,
                created_at=datetime.now()
            )
            db.add(sample_analysis)
            
            db.commit()
            logger.info("Sample data created successfully")
        else:
            logger.info(f"Existing data found: {loan_count} loans, {analysis_count} analyses, {pdf_count} PDFs")
            
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating sample data: {str(e)}")
    finally:
        db.close()

def main():
    """Main migration function"""
    logger.info("Starting data migration...")
    
    # Create database tables if they don't exist
    try:
        from Backend.database import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        return
    
    # Run migrations
    try:
        migrate_pdf_reports()
        migrate_feedback_data()
        migrate_analyses_from_pdfs()
        
        # Create sample data if no data exists
        create_sample_data()
        
        logger.info("Data migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Data migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()