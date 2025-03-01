provider "aws" {
  region = "us-east-1"
}

############################
# VPC, Subnet, and Routing #
############################

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "django-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"
  tags = {
    Name = "django-public-subnet"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "django-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "django-public-rt"
  }
}

resource "aws_route_table_association" "public_association" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

###############################
# Security Group Configuration#
###############################

resource "aws_security_group" "django_sg" {
  name        = "django-sg"
  description = "Allow inbound HTTP and SSH"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Allow HTTPs"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "django-sg"
  }
}

##############################
# IAM Role for EC2 to access ECR
##############################

resource "aws_key_pair" "mtc_auth"{
  key_name = "mtckey"
  public_key = file("~/.ssh/mtckey.pub")
}

resource "aws_iam_role" "ec2_role" {
  name = "ec2-ecr-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name = "ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
}

##############################
# EC2 Instance with Docker Deployment
##############################

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "django_ec2" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.django_sg.id]
  key_name                    = aws_key_pair.mtc_auth.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_instance_profile.name

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    amazon-linux-extras install docker -y
    service docker start
    usermod -a -G docker ec2-user

    # Login to ECR using the instance's IAM role
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 454900097069.dkr.ecr.us-east-1.amazonaws.com

    # Pull and run the Docker container from ECR
    docker pull 454900097069.dkr.ecr.us-east-1.amazonaws.com/django-ec2-complete:django
    # docker pull 454900097069.dkr.ecr.us-east-1.amazonaws.com/django-ec2-complete:nginx
    docker run -d -p 8000:8000  454900097069.dkr.ecr.us-east-1.amazonaws.com/django-ec2-complete:django
    # docker run -d -p 80:80  454900097069.dkr.ecr.us-east-1.amazonaws.com/django-ec2-complete:nginx
  EOF

  tags = {
    Name = "Django_EC2_Complete_Server"
  }
}
