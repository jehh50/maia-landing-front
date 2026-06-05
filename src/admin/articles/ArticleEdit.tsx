import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, MenuItem, Stack, Alert, CircularProgress, Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import {
  getAdminArticle, createAdminArticle, updateAdminArticle,
  type ArticleStatus, type ArticleInput,
} from '../../lib/api';

const empty: ArticleInput = { title: '', slug: '', excerpt: '', body_md: '', cover_url: '', status: 'draft' };

export default function ArticleEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();

  const [form, setForm]         = useState<ArticleInput>(empty);
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    getAdminArticle(id!).then(({ ok, data }) => {
      if (ok && data && 'article' in data) {
        const a = data.article;
        setForm({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt ?? '',
          body_md: a.body_md,
          cover_url: a.cover_url ?? '',
          status: a.status,
        });
      } else {
        setErrorMsg('No se pudo cargar el artículo');
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const onChange = (k: keyof ArticleInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };

  const onBodyChange = (value: string | undefined) => {
    setForm(prev => ({ ...prev, body_md: value ?? '' }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccess(false);
    if (!form.title.trim()) { setErrorMsg('El título es requerido'); return; }
    if (!form.body_md.trim()) { setErrorMsg('El contenido es requerido'); return; }
    setSaving(true);
    const payload: ArticleInput = {
      title:     form.title.trim(),
      slug:      form.slug?.trim() || undefined,
      excerpt:   form.excerpt?.trim() || undefined,
      body_md:   form.body_md,
      cover_url: form.cover_url?.trim() || undefined,
      status:    form.status,
    };
    const { ok, data } = isNew
      ? await createAdminArticle(payload)
      : await updateAdminArticle(id!, payload);
    setSaving(false);

    if (ok && data && 'article' in data) {
      setSuccess(true);
      if (isNew) {
        navigate(`/admin/articles/${data.article.id}`, { replace: true });
      }
    } else {
      const msg = data && 'error' in data && data.error ? data.error : 'No se pudo guardar';
      setErrorMsg(msg);
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Button component={RouterLink} to="/admin/articles" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Volver
      </Button>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        {isNew ? 'Nuevo artículo' : 'Editar artículo'}
      </Typography>

      <Box component="form" onSubmit={onSubmit} sx={{ maxWidth: 1100 }}>
        <Stack spacing={2}>
          <TextField
            label="Título *"
            value={form.title}
            onChange={onChange('title')}
            disabled={saving}
            fullWidth
            inputProps={{ 'aria-label': 'Título' }}
          />
          <TextField
            label="Slug"
            value={form.slug ?? ''}
            onChange={onChange('slug')}
            disabled={saving}
            helperText="Opcional. Si lo dejas vacío, se generará desde el título."
            fullWidth
            inputProps={{ 'aria-label': 'Slug', style: { fontFamily: 'monospace' } }}
          />
          <TextField
            label="Resumen / Excerpt"
            value={form.excerpt ?? ''}
            onChange={onChange('excerpt')}
            disabled={saving}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="URL de portada"
            value={form.cover_url ?? ''}
            onChange={onChange('cover_url')}
            disabled={saving}
            placeholder="https://…"
            fullWidth
          />
          <TextField
            select
            label="Estado"
            value={form.status ?? 'draft'}
            onChange={e => setForm(prev => ({ ...prev, status: e.target.value as ArticleStatus }))}
            disabled={saving}
            fullWidth
          >
            <MenuItem value="draft">Borrador</MenuItem>
            <MenuItem value="published">Publicado</MenuItem>
          </TextField>

          <Box>
            <Typography
              component="label"
              htmlFor="body-md-editor"
              sx={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}
            >
              Contenido (Markdown enriquecido) *
            </Typography>
            <Box
              data-color-mode="light"
              sx={{
                '& .w-md-editor': {
                  borderRadius: 1.5,
                  border: '1px solid var(--border)',
                  boxShadow: 'none',
                },
                '& .w-md-editor:focus-within': {
                  borderColor: 'primary.main',
                  outline: 'none',
                },
                '& .w-md-editor-toolbar': {
                  background: 'var(--bg-soft)',
                  borderBottom: '1px solid var(--border)',
                },
              }}
            >
              <MDEditor
                id="body-md-editor"
                value={form.body_md}
                onChange={onBodyChange}
                height={420}
                preview="live"
                textareaProps={{
                  'aria-label': 'Contenido',
                  placeholder: 'Escribe el contenido del artículo en Markdown…',
                  disabled: saving,
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Soporta tablas, listas, código, imágenes (URL) y videos de YouTube/Vimeo (pega el link en
              su propia línea para embebido responsivo).
            </Typography>
          </Box>

          <Box>
            <Typography
              component="div"
              sx={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 1 }}
            >
              Vista previa
            </Typography>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderColor: 'var(--border)' }}>
              {form.body_md.trim()
                ? <MarkdownRenderer body={form.body_md} compact />
                : <Typography color="text.disabled" sx={{ fontStyle: 'italic' }}>
                    La vista previa aparecerá aquí.
                  </Typography>}
            </Paper>
          </Box>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          {success && !errorMsg && <Alert severity="success">Guardado correctamente.</Alert>}

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Guardando…' : isNew ? 'Crear artículo' : 'Guardar cambios'}
            </Button>
            <Button component={RouterLink} to="/admin/articles" disabled={saving}>
              Cancelar
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
