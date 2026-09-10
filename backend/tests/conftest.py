import os

# Isolate test executions to a separate test database so development data is never wiped
os.environ["MONGODB_DB_NAME"] = "veritasai_test"
