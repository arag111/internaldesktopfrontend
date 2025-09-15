import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#7c8ff0',
      dark: '#5a67d8'
    },
    secondary: {
      main: '#764ba2',
      light: '#8760ab',
      dark: '#663e8e'
    },
    success: {
      main: '#48bb78',
      light: '#68d391',
      dark: '#38a169'
    },
    warning: {
      main: '#f6ad55',
      light: '#f8b86c',
      dark: '#ed8936'
    },
    error: {
      main: '#fc8181',
      light: '#fd9999',
      dark: '#e53e3e'
    },
    background: {
      default: '#f7fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#2d3748',
      secondary: '#718096'
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.03em'
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em'
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h6: {
      fontWeight: 600
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          borderRadius: 16,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
          }
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a67d8 0%, #663e8e 100%)',
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '&:hover fieldset': {
              borderColor: '#667eea',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            }
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f7fafc'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          backgroundColor: '#ffffff'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '2px 0 12px rgba(0, 0, 0, 0.05)'
        }
      }
    }
  }
});

export default appTheme;