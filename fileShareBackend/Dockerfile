# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Create the app directory
RUN mkdir /app
 
# Set the working directory inside the container
WORKDIR /app
 
# Set environment variables 
# Prevents Python from writing pyc files to disk
ENV PYTHONDONTWRITEBYTECODE=1
#Prevents Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED=1 
 
# Upgrade pip
RUN pip install --upgrade pip 
 
# Copy the Django project  and install dependencies
COPY requirements.txt  /app/
 
# run this command to install all dependencies 
RUN pip install --no-cache-dir -r requirements.txt
 
# Copy the Django project to the container
COPY . /app/
 
# Expose the Django port
EXPOSE 8000

# Run the server over HTTPS using runserver_plus (requires django-extensions)
CMD ["python", "manage.py", "runserver_plus", "0.0.0.0:8000", "--cert-file", "cert.pem", "--key-file", "key.pem"]
