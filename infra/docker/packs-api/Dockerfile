FROM python:3.11-slim

WORKDIR /app

RUN pip install uv

COPY packs-api/pyproject.toml .
RUN uv pip install --system .

COPY packs-api/src/ src/

CMD ["python", "-m", "uvicorn", "src.backend.main:app", "--host", "0.0.0.0", "--port", "8766"]
