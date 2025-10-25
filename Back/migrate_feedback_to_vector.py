import json
import logging
from pathlib import Path
from src.llm.vector_db import LoanVectorDB
from src.llm.feedback import FeedbackSystem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_existing_feedback():
    """Migrate existing feedback from JSON to vector DB"""
    
    feedback_file = Path("./Data/feedback_db.json")
    if not feedback_file.exists():
        logger.error("No feedback database found")
        return
    
    # Initialize components
    vector_db = LoanVectorDB()
    feedback_system = FeedbackSystem(vector_db)
    
    # Load feedback data
    with open(feedback_file, 'r') as f:
        feedback_data = json.load(f)
    
    migrated_count = 0
    
    for entry in feedback_data.get('feedback_entries', []):
        feedback = entry.get('feedback', {})
        loan_id = feedback.get('loan_id')
        
        if not loan_id:
            continue
            
        try:
            # Get the analysis from PDF
            analysis = feedback_system.get_loan_analysis(loan_id)
            if not analysis:
                logger.warning(f"No PDF analysis found for loan {loan_id}")
                continue
            
            # Update vector DB with feedback
            feedback_system._update_vector_db_with_feedback(loan_id, feedback, analysis)
            migrated_count += 1
            logger.info(f"Migrated feedback for loan {loan_id}")
            
        except Exception as e:
            logger.error(f"Failed to migrate feedback for loan {loan_id}: {str(e)}")
    
    logger.info(f"Successfully migrated {migrated_count} feedback entries to vector DB")

if __name__ == "__main__":
    migrate_existing_feedback()