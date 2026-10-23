FROM python:3.12-slim
WORKDIR /app

# Install the libraries first, so this layer is reused when only the code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py store.py ./

# Run as a normal user, not root (with a home folder: gunicorn keeps a control socket there)
RUN useradd --create-home bot
USER bot
EXPOSE 8000

# One worker, because the conversations are kept in memory (see app.py); threads let it
# answer several customers at once. The AI can take a while, hence the long timeout.
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "8", "--timeout", "120", "app:app"]
