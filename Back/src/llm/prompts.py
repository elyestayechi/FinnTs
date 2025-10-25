import json
import logging
from typing import Dict, List, Optional
from src.utils import Utils

class LLMPromptBuilder:
    
    @staticmethod
    def _get_loan_type_template(loan_type: str) -> str:
        """Get specialized template based on loan type - FIXED FORMATTING"""
        templates = {
            "large_commercial": """
You are a senior commercial lending risk analyst with 20 years of experience in corporate banking.
Conduct a comprehensive assessment of this commercial loan application, focusing on:

1. **Business Financial Health**: Cash flow analysis, debt service coverage ratio, liquidity position
2. **Industry Risk**: Market conditions, competitive landscape, regulatory environment
3. **Management Evaluation**: Experience, track record, succession planning
4. **Collateral Assessment**: Quality, liquidity, coverage ratios
5. **Covenant Structure**: Appropriate financial covenants and monitoring requirements

=== APPLICATION DETAILS ===

**Borrower Profile:**
- Name: {customer_name}
- Loan Amount: {loan_amount} {currency}
- Term: {term_months} months

**Financial Metrics:**
- Personal Contribution: {personal_contribution} {currency}
- Monthly Payment: {monthly_payment} {currency}
- Total Assets: {assets_total} {currency}
- APR: {apr}%
- Interest Rate: {interest_rate}%

**Risk Assessment:**
Total Score: {total_score}
{risk_table}

**Additional Information:**
{udf_data}

=== REQUIRED ANALYSIS ===

Provide a professional assessment with VALID JSON following this exact structure:
{{
    "summary": "Comprehensive commercial risk analysis",
    "recommendation": "approve|deny|review",
    "rationale": [
        "Primary reason for recommendation",
        "Supporting financial analysis",
        "Key risk factors"
    ],
    "key_findings": [
        "Specific finding 1 with impact",
        "Specific finding 2 with impact"
    ],
    "conditions": [
        "Specific condition 1 if approving",
        "Verification needed if reviewing"
    ],
    "commercial_analysis": [
        "Industry risk assessment",
        "Management evaluation", 
        "Collateral analysis",
        "Financial covenant recommendations",
        "Monitoring requirements"
    ]
}}
""",
            "agricultural": """
You are an agricultural lending specialist with deep expertise in farming risks and agribusiness.
Analyze this agricultural loan application considering:

1. **Crop Yield Projections**: Historical yields, weather patterns, soil quality
2. **Commodity Price Risks**: Market volatility, price hedging strategies
3. **Weather & Climate Impact**: Drought risk, irrigation capabilities, climate resilience
4. **Farming Operations**: Equipment quality, operational efficiency, technology adoption
5. **Government Programs**: Eligibility for subsidies, insurance programs, support mechanisms

=== APPLICATION DETAILS ===

**Farmer Profile:**
- Name: {customer_name}
- Loan Amount: {loan_amount} {currency}
- Term: {term_months} months

**Financial Metrics:**
- Personal Contribution: {personal_contribution} {currency}
- Monthly Payment: {monthly_payment} {currency}
- Total Assets: {assets_total} {currency}
- APR: {apr}%
- Interest Rate: {interest_rate}%

**Risk Assessment:**
Total Score: {total_score}
{risk_table}

**Additional Information:**
{udf_data}

=== REQUIRED ANALYSIS ===

Provide an agricultural risk assessment with VALID JSON following this structure:
{{
    "summary": "Agricultural risk analysis",
    "recommendation": "approve|deny|review",
    "rationale": [
        "Primary agricultural risk factors",
        "Commodity market analysis",
        "Weather and climate impact"
    ],
    "key_findings": [
        "Yield projection assessment",
        "Price risk evaluation",
        "Operational efficiency"
    ],
    "conditions": [
        "Specific condition 1 if approving",
        "Verification needed if reviewing"
    ],
    "agricultural_analysis": [
        "Crop insurance requirement",
        "Price hedging recommendation",
        "Government program enrollment",
        "Seasonal repayment structure",
        "Weather risk mitigation"
    ]
}}
""",
            "personal": """
You are a consumer lending expert specializing in personal loans and individual credit assessment.
Evaluate this personal loan application focusing on:

1. **Creditworthiness**: Income stability, debt-to-income ratio, credit history
2. **Repayment Capacity**: Cash flow analysis, employment stability, financial resilience
3. **Purpose Evaluation**: Loan purpose合理性, alignment with borrower's financial goals
4. **Risk Mitigation**: Collateral quality, guarantor assessment, insurance coverage
5. **Regulatory Compliance**: Consumer protection regulations, fair lending practices

=== APPLICATION DETAILS ===

**Borrower Profile:**
- Name: {customer_name}
- Age: {customer_age}
- Gender: {customer_gender}
- Marital Status: {marital_status}
- Loan Amount: {loan_amount} {currency}
- Term: {term_months} months

**Financial Metrics:**
- Personal Contribution: {personal_contribution} {currency}
- Monthly Payment: {monthly_payment} {currency}
- Total Assets: {assets_total} {currency}
- APR: {apr}%
- Interest Rate: {interest_rate}%

**Risk Assessment:**
Total Score: {total_score}
{risk_table}

**Additional Information:**
{udf_data}

=== REQUIRED ANALYSIS ===

Provide a consumer lending assessment with VALID JSON following this structure:
{{
    "summary": "Personal loan risk analysis",
    "recommendation": "approve|deny|review",
    "rationale": [
        "Creditworthiness assessment",
        "Repayment capacity analysis",
        "Purpose evaluation"
    ],
    "key_findings": [
        "Income stability assessment",
        "Debt burden analysis",
        "Financial behavior evaluation"
    ],
    "conditions": [
        "Specific condition 1 if approving",
        "Verification needed if reviewing"
    ],
    "personal_analysis": [
        "Guarantor requirement if needed",
        "Insurance recommendation",
        "Payment structure adjustment",
        "Credit counseling recommendation",
        "Debt consolidation options"
    ]
}}
""",
            "mortgage": """
You are a mortgage lending specialist with expertise in real estate financing.
Evaluate this mortgage loan application focusing on:

1. **Property Valuation**: Market value assessment, location analysis, property condition
2. **Loan-to-Value Ratio**: Equity position, down payment adequacy
3. **Borrower Qualification**: Income verification, credit history, debt-to-income ratio
4. **Market Conditions**: Real estate market trends, interest rate environment
5. **Insurance Requirements**: Homeowners insurance, PMI if applicable

=== APPLICATION DETAILS ===

**Borrower Profile:**
- Name: {customer_name}
- Age: {customer_age}
- Gender: {customer_gender}
- Marital Status: {marital_status}
- Loan Amount: {loan_amount} {currency}
- Term: {term_months} months

**Financial Metrics:**
- Personal Contribution: {personal_contribution} {currency}
- Monthly Payment: {monthly_payment} {currency}
- Total Assets: {assets_total} {currency}
- APR: {apr}%
- Interest Rate: {interest_rate}%

**Risk Assessment:**
Total Score: {total_score}
{risk_table}

**Additional Information:**
{udf_data}

=== REQUIRED ANALYSIS ===

Provide a mortgage risk assessment with VALID JSON following this structure:
{{
    "summary": "Mortgage loan risk analysis",
    "recommendation": "approve|deny|review",
    "rationale": [
        "Property valuation assessment",
        "Borrower qualification analysis",
        "Market condition evaluation"
    ],
    "key_findings": [
        "LTV ratio analysis",
        "Income verification assessment",
        "Property market position"
    ],
    "conditions": [
        "Specific condition 1 if approving",
        "Verification needed if reviewing"
    ],
    "mortgage_analysis": [
        "Property appraisal requirement",
        "Homeowners insurance requirement",
        "Title verification",
        "Flood insurance if applicable",
        "PMI requirement if LTV > 80%"
    ]
}}
""",
            "standard": """
You are a senior financial risk analyst with 15 years of experience in banking.
Conduct a professional assessment of this loan application, focusing on:

1. **Data Consistency**: Verification of provided information, red flags
2. **Financial Capacity**: Repayment ability, debt service coverage, liquidity
3. **Risk Factor Correlation**: Interrelationships between risk factors
4. **Profile-Purpose Alignment**: Consistency between borrower profile and loan purpose

=== APPLICATION DETAILS ===

**Customer Profile:**
- Name: {customer_name}
- Age: {customer_age}
- Gender: {customer_gender}
- Marital Status: {marital_status}

**Financial Details:**
- Loan Amount: {loan_amount} {currency}
- Personal Contribution: {personal_contribution} {currency}
- Monthly Payment: {monthly_payment} {currency}
- Assets Value: {assets_total} {currency}
- APR: {apr}%
- Interest Rate: {interest_rate}%
- Term: {term_months} months

**Risk Assessment:**
Total Score: {total_score}
{risk_table}

**Additional Information:**
{udf_data}

=== REQUIRED ANALYSIS ===

Provide a professional assessment with VALID JSON following this structure:
{{
    "summary": "Comprehensive risk analysis",
    "recommendation": "approve|deny|review",
    "rationale": [
        "Primary reason for recommendation",
        "Supporting evidence from data",
        "Risk/benefit analysis"
    ],
    "key_findings": [
        "Specific finding 1 with impact analysis",
        "Specific finding 2 with impact analysis"
    ],
    "conditions": [
        "Specific condition 1 if approving",
        "Verification needed if reviewing"
    ],
    "data_mismatches": [
        "Notable inconsistency 1 between fields",
        "Notable inconsistency 2 between fields"
    ]
}}
"""
        }
        return templates.get(loan_type, templates["standard"])

    @staticmethod
    def _determine_loan_type(loan_data: Dict) -> str:
        """Determine loan type based on loan data characteristics"""
        try:
            financials = loan_data['loan_info']['financials']
            loan_amount = financials.get('loan_amount', 0)
            product_info = loan_data['loan_info']['basic_info'].get('product', '').lower()
            
            # Check for agricultural indicators
            if any(ag_indicator in product_info for ag_indicator in ['agricol', 'ziraati', 'bovine', 'ovine', 'culture']):
                return "agricultural"
            
            # Check for mortgage indicators
            if any(mortgage_indicator in product_info for mortgage_indicator in ['immobilier', 'logement', 'maison']):
                return "mortgage"
            
            # Large commercial loans
            if loan_amount > 100000:  # Over 100,000 TND
                return "large_commercial"
            
            # Personal loans (smaller amounts)
            if loan_amount <= 50000:  # Up to 50,000 TND
                return "personal"
            
            # Default to standard
            return "standard"
            
        except Exception as e:
            logging.warning(f"Loan type determination failed: {str(e)}")
            return "standard"

    @staticmethod
    def build_basic_prompt(loan_data: Dict) -> str:
        """
        Build comprehensive risk assessment prompt with loan type specialization
        """
        try:
            customer_info = loan_data['customer_info']
            financials = loan_data['loan_info']['financials']
            risk_assessment = loan_data['risk_assessment']
            
            # Determine loan type
            loan_type = LLMPromptBuilder._determine_loan_type(loan_data)
            logging.info(f"Using loan type template: {loan_type}")
            
            # Prepare UDF data
            udf_details = []
            for group in customer_info.get('udf_data', []):
                if group.get('udfGroupeFieldsModels'):
                    udf_details.append(f"\n{group['userDefinedFieldGroupName']}:")
                    for field in group['udfGroupeFieldsModels']:
                        udf_details.append(f"- {field.get('fieldName', 'Unknown')}: {field.get('value', 'N/A')}")
            udf_str = "".join(udf_details) if udf_details else "None"

            # Format risk factors table
            risk_table = ["| Risk Factor | Value | Score | Risk Level |",
                          "|------------|-------|-------|------------|"]
            for field, details in risk_assessment.get('indicators', {}).items():
                risk_table.append(
                    f"| {field.replace('_', ' ').title()} | {details.get('value', 'N/A')} | "
                    f"{details.get('score', 0)} | {details.get('risk_level', 'N/A')} |"
                )
            risk_table_str = "\n".join(risk_table)

            # Get the appropriate template
            template = LLMPromptBuilder._get_loan_type_template(loan_type)
            
            # Prepare template variables
            template_vars = {
                'customer_name': customer_info.get('name', 'Unknown'),
                'customer_age': customer_info['demographics'].get('age', 'N/A'),
                'customer_gender': customer_info['demographics'].get('gender', 'N/A'),
                'marital_status': customer_info['demographics'].get('marital_status', 'N/A'),
                'loan_amount': financials.get('loan_amount', 0),
                'currency': financials.get('currency', 'TND'),
                'personal_contribution': financials.get('personal_contribution', 0),
                'monthly_payment': financials.get('monthly_payment', 0),
                'assets_total': financials.get('assets_total', 0),
                'apr': financials.get('apr', 0),
                'interest_rate': financials.get('interest_rate', 0),
                'term_months': financials.get('term_months', 0),
                'total_score': risk_assessment.get('total_score', 0),
                'risk_table': risk_table_str,
                'udf_data': udf_str
            }
            
            # Format the template with variables
            prompt = template.format(**template_vars)
            return prompt

        except Exception as e:
            logging.error(f"Prompt building failed: {str(e)}")
            raise

    @staticmethod 
    def build_contextual_prompt(loan_data: Dict, similar_loans: Dict) -> str:
        """
        Build RAG-enhanced prompt with comparative historical analysis and loan type specialization.
        """
        try:
            # First build the basic prompt with loan type specialization
            base_prompt = LLMPromptBuilder.build_basic_prompt(loan_data)
            
            # Determine loan type for contextual analysis
            loan_type = LLMPromptBuilder._determine_loan_type(loan_data)
            
            # Prepare historical cases section
            context_cases = []
            for i, doc in enumerate(similar_loans.get('documents', [])[:3], 1):
                try:
                    doc_data = json.loads(doc) if isinstance(doc, str) else doc
                    risk_assessment = doc_data.get('risk_assessment', {})
                    
                    case_info = {
                        'customer': doc_data.get('customer_info', {}).get('name', 'Unknown'),
                        'amount': doc_data.get('loan_info', {}).get('financials', {}).get('loan_amount', 'N/A'),
                        'score': risk_assessment.get('total_score', 'N/A'),
                        'decision': doc_data.get('llm_analysis', {}).get('recommendation', 'N/A'),
                        'top_risks': [
                            f"{k} (Score: {v.get('score', 0)})" 
                            for k, v in risk_assessment.get('indicators', {}).items()
                            if v.get('score', 0) > 10
                        ],
                        'conditions': doc_data.get('llm_analysis', {}).get('conditions', [])
                    }
                    
                    context_cases.append(
                        f"Case {i}:\n"
                        f"- Customer: {case_info['customer']}\n"
                        f"- Amount: {case_info['amount']} ({case_info['decision'].upper()})\n"
                        f"- Risk Score: {case_info['score']}\n"
                        f"- Top Risks: {', '.join(case_info['top_risks']) if case_info['top_risks'] else 'None'}\n"
                        f"- Conditions Applied: {len(case_info['conditions'])}"
                    )
                except Exception as e:
                    logging.warning(f"Couldn't fully process similar loan {i}: {str(e)}")
                    continue

            historical_context = "\n".join(context_cases) if context_cases else "No sufficiently similar historical cases"

            # Add loan-type specific historical context
            contextual_instructions = {
                "large_commercial": "Focus on industry trends, market position comparisons, and commercial risk patterns",
                "agricultural": "Compare seasonal patterns, commodity price histories, and weather impact similarities",
                "personal": "Analyze credit behavior patterns, income stability comparisons, and consumer risk trends",
                "mortgage": "Evaluate property market trends, location comparisons, and real estate risk patterns",
                "standard": "Consider general risk patterns and decision consistency across similar profiles"
            }
            
            loan_type_instruction = contextual_instructions.get(loan_type, contextual_instructions["standard"])

            # Add historical context to the base prompt
            contextual_prompt = f"""
{base_prompt}

=== HISTORICAL CONTEXT ===

Consider these similar historical cases in your analysis:
{historical_context}

=== {loan_type.upper()} SPECIFIC COMPARATIVE ANALYSIS ===

{loan_type_instruction}

1. Significant deviations from historical patterns (>20% difference)
2. Emerging risks not present in historical cases
3. Improved risk factors compared to history
4. Consistency with past decision patterns for similar {loan_type} loans

=== UPDATED RESPONSE FORMAT ===
Add this field to your JSON response:
{{
    "comparative_analysis": [
        "Key difference 1 with historical context",
        "Key difference 2 with trend analysis"
    ],
    "loan_type_specific_insights": [
        "Specialized insight 1 for {loan_type} loans",
        "Specialized insight 2 for {loan_type} loans"
    ]
}}

Maintain all other fields from the basic analysis format.
"""
            return contextual_prompt

        except Exception as e:
            logging.error(f"Contextual prompt building failed: {str(e)}")
            raise