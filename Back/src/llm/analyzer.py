import logging
import ollama
import json
from time import time
from typing import Dict, Optional, List, Union
from pathlib import Path
from ..data_models import LLMAnalysis
from .prompts import LLMPromptBuilder
from .vector_db import LoanVectorDB
from .feedback import FeedbackSystem

logger = logging.getLogger(__name__)

class LLMAnalyzer:
    def __init__(self, vector_db: Optional[LoanVectorDB] = None):
        self.vector_db = vector_db
        self.embedding_model = "nomic-embed-text"
        self.generation_model = "deepseek-r1:1.5b"
        self.last_analysis_time = 0
        self.last_analysis_type = "basic"
        self.feedback_system = FeedbackSystem(vector_db)
        
        try:
            self._verify_models()
        except Exception as e:
            logger.warning(f"Model verification warning: {str(e)}")

    def _verify_models(self):
        try:
            models_response = ollama.list()
            available_models = set()

            if isinstance(models_response, dict) and 'models' in models_response:
                for model in models_response['models']:
                    if 'model' in model:
                        available_models.add(model['model'])
                    elif 'name' in model:
                        available_models.add(model['name'])

            if self.embedding_model not in available_models:
                logger.info(f"Downloading embedding model: {self.embedding_model}")
                ollama.pull(self.embedding_model)

            if self.generation_model not in available_models:
                logger.info(f"Downloading generation model: {self.generation_model}")
                ollama.pull(self.generation_model)

        except Exception as e:
            logger.error(f"Model verification error: {str(e)}")
            raise

    def analyze_loan(self, loan_data: Dict) -> LLMAnalysis:
        start_time = time()
        try:
            if self.vector_db and self._has_similar_loans():
                analysis = self._analyze_with_context(loan_data)
                self.last_analysis_type = "contextual"
            else:
                analysis = self._basic_analysis(loan_data)
                self.last_analysis_type = "basic"
                
            if 'llm_analysis' not in loan_data:
                loan_data['llm_analysis'] = analysis
                
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            analysis = self._create_fallback_analysis(str(e))
            self.last_analysis_type = "fallback"

        self.last_analysis_time = time() - start_time
        logger.info(f"Analysis completed ({self.last_analysis_type}) in {self.last_analysis_time:.2f}s")
        return analysis

    def _has_similar_loans(self) -> bool:
        try:
            return self.vector_db.collection.count() > 0
        except Exception as e:
            logger.warning(f"Vector DB check failed: {str(e)}")
            return False

    def _basic_analysis(self, loan_data: Dict) -> LLMAnalysis:
        prompt = LLMPromptBuilder.build_basic_prompt(loan_data)
        prompt = self._apply_feedback_to_prompt(prompt, loan_data)
        response = self._call_llm(prompt)
        return self._parse_response(response)

    def _analyze_with_context(self, loan_data: Dict) -> LLMAnalysis:
        try:
            embedding_response = ollama.embeddings(
                model=self.embedding_model,
                prompt=json.dumps(loan_data)
            )
            embedding = embedding_response['embedding']

            similar_loans = self.vector_db.find_similar_loans(embedding)

            if not similar_loans['documents']:
                logger.info("No similar loans found - falling back to basic analysis")
                return self._basic_analysis(loan_data)

            prompt = LLMPromptBuilder.build_contextual_prompt(loan_data, similar_loans)
            prompt = self._apply_feedback_to_prompt(prompt, loan_data)
            response = self._call_llm(prompt)

            return self._parse_response(response, context=similar_loans)

        except Exception as e:
            logger.warning(f"Contextual analysis failed: {str(e)}")
            return self._basic_analysis(loan_data)

    def _apply_feedback_to_prompt(self, prompt: str, loan_data: Dict) -> str:
        if not self.vector_db:
            return prompt
        
        try:
            embedding_response = ollama.embeddings(
                model=self.embedding_model,
                prompt=json.dumps(loan_data))
            embedding = embedding_response['embedding']
        
        # Query for similar loans WITH feedback
            similar_with_feedback = self.vector_db.collection.query(
                query_embeddings=[embedding],
                n_results=5,  # Increased to get more context
                where={"has_feedback": True},
                include=['documents', 'metadatas', 'distances']
            )
        
            if not similar_with_feedback['documents']:
                return prompt
            
        # Build comprehensive feedback context
            feedback_context = self._build_feedback_context(
                similar_with_feedback['documents'][0],
                similar_with_feedback['metadatas'][0],
                similar_with_feedback.get('distances', [[]])[0]
            )
        
            if feedback_context:
                return (
                    prompt + "\n\n=== RELEVANT FEEDBACK FROM SIMILAR CASES ===\n" +
                    feedback_context + 
                    "\n\nPlease carefully apply these lessons to your current analysis. " +
                    "Pay special attention to any inconsistencies or patterns mentioned in the feedback."
                )
            return prompt
        
        except Exception as e:
            logger.warning(f"Feedback application failed: {str(e)}")
            return prompt

    def _build_feedback_context(self, documents: List[str], metadatas: List[Dict], distances: List[float]) -> str:
        """Build comprehensive feedback context from similar cases"""
        feedback_entries = []
    
        for i, (doc, meta, distance) in enumerate(zip(documents, metadatas, distances)):
            if meta.get('has_feedback') and meta.get('feedback', {}).get('comments'):
                try:
                    loan_data = json.loads(doc) if isinstance(doc, str) else doc
                    similarity_score = 1 - distance  # Convert distance to similarity
                
                    feedback = meta['feedback']
                    customer_info = loan_data.get('customer_info', {})
                
                    entry = (
                        f"\n--- SIMILAR CASE {i+1} (Similarity: {similarity_score:.2f}) ---\n"
                        f"Customer: {customer_info.get('name', 'Unknown')}\n"
                        f"Loan Amount: {loan_data.get('loan_info', {}).get('financials', {}).get('loan_amount', 'N/A')}\n"
                        f"AI Recommendation: {meta.get('agent_decision', 'N/A')}\n"
                        f"Human Decision: {feedback.get('human_decision', 'N/A')}\n"
                        f"Feedback Rating: {feedback.get('rating', 'N/A')}/5\n"
                        f"Key Feedback: {feedback.get('comments', 'No comments')}\n"
                    )
                
                    # Add specific learning points for high-rated feedback
                    if feedback.get('rating', 0) >= 4:
                        entry += f"RELIABLE GUIDANCE: This feedback was highly rated - apply these insights\n"
                    elif feedback.get('rating', 0) <= 2:
                        entry += f"CAUTION: This feedback indicates issues with the AI analysis\n"
                    
                    feedback_entries.append(entry)
                
                except Exception as e:
                    logger.warning(f"Couldn't process feedback entry {i}: {str(e)}")
                    continue
    
        if not feedback_entries:
            return ""
    
        # Add summary of key patterns
        summary_prompt = (
            "Based on the following feedback from similar loan cases, extract the most important "
            "actionable insights and patterns that should be applied to future analyses:\n\n" +
            "\n".join(feedback_entries) +
            "\n\nProvide 3-5 specific, actionable insights in bullet points:"
        )
    
        try:
            response = ollama.generate(
                model=self.generation_model,
                prompt=summary_prompt,
                options={'temperature': 0.1, 'num_ctx': 2048}  # Lower temperature for consistency
            )
            return f"FEEDBACK SUMMARY:\n{response['response']}\n\nDETAILED FEEDBACK CASES:\n" + "\n".join(feedback_entries)
        except Exception as e:
            logger.warning(f"Feedback summarization failed: {str(e)}")
            return "\n".join(feedback_entries)  # Fallback to raw feedback

    def _summarize_feedback(self, documents: List[str], metadatas: List[Dict]) -> str:
        feedback_entries = []
        for doc, meta in zip(documents, metadatas):
            if meta.get('feedback', {}).get('comments'):
                loan_data = json.loads(doc)
                feedback_entries.append(
                    f"Case: {loan_data.get('customer_info', {}).get('name', 'Unknown')}\n"
                    f"Feedback Rating: {meta['feedback']['rating']}/5\n"
                    f"Feedback: {meta['feedback']['comments']}\n"
                )
        
        if not feedback_entries:
            return ""
        
        prompt = (
            "Extract actionable insights from these loan assessment feedback entries:\n\n" +
            "\n---\n".join(feedback_entries) +
            "\n\nProvide 3-5 concise bullet points of improvements to apply to future analyses:"
        )
        
        try:
            response = ollama.generate(
                model=self.generation_model,
                prompt=prompt,
                options={'temperature': 0.2, 'num_ctx': 2048}
            )
            return response['response']
        except Exception as e:
            logger.warning(f"Feedback summarization failed: {str(e)}")
            return ""

    def _call_llm(self, prompt: str) -> str:
        try:
            response = ollama.generate(
                model=self.generation_model,
                prompt=prompt,
                options={
                    'temperature': 0.3,
                    'num_ctx': 4096,
                    'timeout': 120
                }
            )
            return response['response']
        except Exception as e:
            logger.error(f"LLM call failed: {str(e)}")
            raise

    def _parse_response(self, response: str, context: Optional[Dict] = None) -> LLMAnalysis:
        try:
            json_str = response[response.find('{'):response.rfind('}') + 1]
            data = json.loads(json_str)

            analysis_data = {
                'summary': data.get('summary', 'No summary provided'),
                'recommendation': data.get('recommendation', 'review').lower(),
                'rationale': self._ensure_list(data.get('rationale', [])),
                'key_findings': self._ensure_list(data.get('key_findings', [])),
                'conditions': self._ensure_list(data.get('conditions', []))
            }

            if context:
                similar_cases = []
                for doc, meta, sim in zip(
                    context['documents'],
                    context.get('metadatas', []),
                    context.get('similarities', [])
                ):
                    try:
                        doc_data = json.loads(doc) if isinstance(doc, str) else doc
                        similar_cases.append({
                            'customer': doc_data.get('customer_info', {}).get('name', 'Unknown'),
                            'amount': doc_data.get('loan_info', {}).get('financials', {}).get('loan_amount', 0),
                            'score': doc_data.get('risk_assessment', {}).get('total_score', 0),
                            'decision': doc_data.get('llm_analysis', {}).get('recommendation', 'N/A'),
                            'metadata': meta or {},
                            'similarity_score': sim
                        })
                    except Exception as e:
                        logger.warning(f"Couldn't process similar loan doc: {str(e)}")
                        continue

                analysis_data['rag_context'] = {
                    'similar_cases': similar_cases
                }

            return LLMAnalysis(**analysis_data)

        except json.JSONDecodeError:
            return LLMAnalysis(
                summary=response[:500],
                recommendation="review",
                rationale=["Could not parse LLM response"],
                key_findings=[],
                conditions=[]
            )
        except Exception as e:
            logger.error(f"Response parsing error: {str(e)}")
            return self._create_fallback_analysis(str(e))

    def _ensure_list(self, value: Union[str, List]) -> List[str]:
        if isinstance(value, str):
            return [value]
        return [str(item) for item in value]

    def _create_fallback_analysis(self, error_msg: str) -> LLMAnalysis:
        return LLMAnalysis(
            summary="Analysis failed due to system error",
            recommendation="review",
            rationale=[error_msg],
            key_findings=["System error occurred during analysis"],
            conditions=[]
        )

    def store_current_loan(self, loan_data: Dict):
        if not self.vector_db:
            return

        try:
            embedding_response = ollama.embeddings(
                model=self.embedding_model,
                prompt=json.dumps(loan_data))
            embedding = embedding_response['embedding']

            loan_id = str(loan_data.get('loan_info', {}).get('basic_info', {}).get('loan_id', 'unknown'))
            
            self.vector_db.collection.upsert(
                ids=[f"loan_{loan_id}"],
                embeddings=[embedding],
                documents=[json.dumps(loan_data)],
                metadatas=[{
                    'loan_id': loan_id,
                    'has_feedback': False,
                    'analysis_type': self.last_analysis_type,
                    'processing_time': self.last_analysis_time,
                    'timestamp': time()
                }]
            )
            logger.info(f"Successfully stored loan {loan_id} in vector DB")

        except Exception as e:
            logger.error(f"Failed to store loan in vector DB: {str(e)}")