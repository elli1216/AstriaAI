import os
from dotenv import load_dotenv

load_dotenv()

WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

GRANITE_INSTRUCT = "ibm/granite-3-8b-instruct"
GRANITE_CODE = "ibm/granite-20b-code-instruct"
GRANITE_GUARDIAN = "ibm/granite-guardian-3-8b"
