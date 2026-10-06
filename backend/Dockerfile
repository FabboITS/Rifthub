FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# sed: rimuove eventuali CRLF (clone da Windows) che romperebbero lo shebang
RUN sed -i 's/\r$//' entrypoint.sh \
    && chmod +x entrypoint.sh \
    && adduser --system --group --no-create-home app \
    && chown -R app:app /app
USER app
EXPOSE 8000
ENTRYPOINT ["sh", "./entrypoint.sh"]
