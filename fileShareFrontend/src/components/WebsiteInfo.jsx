import { Box, Button, Container, Paper, Typography } from '@mui/material'
import React from 'react'
import { useNavigate } from 'react-router-dom'
const WebsiteInfo = () => {
  const navigate = useNavigate()
  return (
    <Box
      sx={{
        minHeight: '92vh',
        width: '100%',
        background: 'linear-gradient(135deg, #F5F7FA, #C3CFE2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            border: '2px solid #1976d2',
            borderRadius: '12px',
          }}
        >
          <Typography variant='h4' align='center' gutterBottom>
            Secure File Sharing Platform
          </Typography>
          <Typography variant='body1' align='justify' gutterBottom>
            Welcome to our Secure File Sharing Platform – a state-of-the-art
            solution designed with your data security in mind. Our platform is
            built with advanced security protocols to ensure that your files
            remain confidential, accessible only by those who are authorized.
          </Typography>

          <Typography variant='h6' gutterBottom>
            Advanced Security Measures
          </Typography>
          <Typography
            variant='body1'
            align='justify'
            gutterBottom
            component='div'
          >
            <ul>
              <li>
                <strong>Client-Side Encryption:</strong> Files are encrypted
                using AES-256-GCM before leaving your device, ensuring that your
                data is secured from the very start.
              </li>
              <li>
                <strong>Robust Password Security:</strong> By leveraging Argon2
                for password hashing, we provide strong protection against
                brute-force attacks.
              </li>
              <li>
                <strong>Multi-Factor Authentication (MFA):</strong> An extra
                layer of protection is added through email-based verification
                codes, making sure that only verified users can access their
                accounts.
              </li>
              <li>
                <strong>JWT Authentication with HttpOnly Cookies:</strong> We
                securely manage sessions by storing JSON Web Tokens in HttpOnly
                cookies, greatly mitigating the risk of XSS attacks.
              </li>
              <li>
                <strong>Role-Based Access Control (RBAC):</strong> Access to
                features and data is strictly governed by user roles, ensuring
                that only authorized personnel can perform sensitive actions.
              </li>
              <li>
                <strong>One-Time Secure Links:</strong> Share your files using
                time-limited, password-protected links, which provide secure
                temporary access.
              </li>
            </ul>
          </Typography>

          <Typography variant='h6' gutterBottom>
            Why this Platform Stands Out
          </Typography>
          <Typography variant='body1' align='justify' gutterBottom>
            Provides comprehensive security strategy combines cutting-edge
            encryption, robust authentication, and strict access control to
            protect your sensitive information at every step. Both the client
            and server sides of the platform implement multiple layers of
            security, ensuring that your data is safeguarded during
            transmission, storage, and retrieval. With continuous updates and
            rigorous testing, our product is designed to stay ahead of potential
            threats, making it a top-notch solution in secure file sharing.
          </Typography>
          <Typography variant='body1' align='center'>
            Experience the next level of secure file sharing – where your
            security is our highest priority.
          </Typography>
          <Box
            sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}
          >
            <Button
              variant='contained'
              onClick={() => navigate('/login')}
              sx={{
                backgroundColor: '#1976d2',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#115293' },
              }}
            >
              Log In
            </Button>
            <Button variant='outlined' onClick={() => navigate('/register')}>
              Register
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default WebsiteInfo
