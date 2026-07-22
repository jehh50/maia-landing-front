import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import theme from './theme/theme';
import App from './App';
import Login from './admin/Login';
import AdminGuard from './admin/AdminGuard';
import AdminLayout from './admin/AdminLayout';
import AdminHome from './admin/AdminHome';
import LeadsList from './admin/leads/LeadsList';
import ArticlesList from './admin/articles/ArticlesList';
import ArticleEdit from './admin/articles/ArticleEdit';
import BlogIndex from './pages/BlogIndex';
import BlogArticle from './pages/BlogArticle';
import LegalPage from './pages/LegalPage';
import { legalDocs } from './pages/legal/legalDocs';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/blog"        element={<BlogIndex />} />
          <Route path="/blog/:slug"  element={<BlogArticle />} />
          <Route path="/privacidad"  element={<LegalPage doc={legalDocs.privacidad} />} />
          <Route path="/terminos"    element={<LegalPage doc={legalDocs.terminos} />} />
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                {user => <AdminLayout user={user} />}
              </AdminGuard>
            }
          >
            <Route index element={<AdminHome />} />
            <Route path="leads"        element={<LeadsList />} />
            <Route path="articles"     element={<ArticlesList />} />
            <Route path="articles/new" element={<ArticleEdit />} />
            <Route path="articles/:id" element={<ArticleEdit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
