FROM python:3.12-slim

WORKDIR /work

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["alembic"]
CMD ["upgrade", "head"]
