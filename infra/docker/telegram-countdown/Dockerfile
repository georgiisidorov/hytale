FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV PYTHONUNBUFFERED=1
ENV STATE_PATH=/data/state.json
ENV TELEGRAM_SESSION_PATH=/data/session

CMD ["python", "-u", "main.py"]
