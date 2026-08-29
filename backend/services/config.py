import os
from dotenv import load_dotenv

load_dotenv()

WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_API_KEY = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

GRANITE_INSTRUCT = os.getenv("GRANITE_INSTRUCT_MODEL", "ibm/granite-4-h-small")
GRANITE_CODE = os.getenv("GRANITE_CODE_MODEL", "ibm/granite-4-h-small")
GRANITE_GUARDIAN = os.getenv("GRANITE_GUARDIAN_MODEL", "ibm/granite-4-h-small")

TARGET_APP_URL = os.getenv("TARGET_APP_URL", "http://localhost:8001")
SANDBOX_TIMEOUT_SECONDS = int(os.getenv("SANDBOX_TIMEOUT_SECONDS", "45"))
