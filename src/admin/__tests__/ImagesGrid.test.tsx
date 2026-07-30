import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import ImagesGrid from '../images/ImagesGrid';
import { resetMockImages } from '../images/mockImages';
import type { AdminUser } from '../../lib/api';

// Las tres rutas de escritura de imágenes exigen rol admin; el editor solo lee.
const adminUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };
const editorUser: AdminUser = { id: 2, email: 'bruno.diaz@maia.mx', name: 'Bruno Díaz', role: 'editor' };

// useOutletContext exige un Outlet padre, así que montamos una Route anidada.
function renderImages(user: AdminUser = adminUser) {
  return render(
    <MemoryRouter initialEntries={['/admin/images']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/images" element={<ImagesGrid />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** Un PNG pequeño y válido: pasa tipo, extensión y tamaño. */
function pngFile(name = 'nueva-foto.png'): File {
  return new File(['contenido-binario'], name, { type: 'image/png' });
}

/** Un PNG que declara más de 5 MB sin reservar la memoria de verdad. */
function hugePngFile(): File {
  const file = pngFile('panoramica.png');
  Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
  return file;
}

beforeEach(() => {
  resetMockImages();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }) as Response);
});

afterEach(() => vi.restoreAllMocks());

describe('ImagesGrid (maqueta con datos mock)', () => {
  it('pinta la galería por sección con filename, alt, orden, tamaño y fecha, sin tocar el backend', async () => {
    renderImages();

    expect(await screen.findByText('hero.png')).toBeInTheDocument();
    const card = screen.getByTestId('image-card-1');
    expect(within(card).getByText('Panel de MaIA respondiendo un chat de WhatsApp')).toBeInTheDocument();
    expect(within(card).getByText('Orden 0')).toBeInTheDocument();
    expect(within(card).getByText('73 KB')).toBeInTheDocument();
    expect(within(card).getByText(/10\/2\/2026/)).toBeInTheDocument();

    // Las dos secciones del contrato, y solo esas.
    expect(screen.getByRole('heading', { name: 'Hero' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CTA final' })).toBeInTheDocument();
    expect(screen.getByText('maia.png')).toBeInTheDocument();

    // Una imagen sin alt no inventa texto alternativo.
    expect(within(screen.getByTestId('image-card-3')).getByText('Sin texto alternativo')).toBeInTheDocument();

    // Es una maqueta: no debe salir ninguna petición.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('el filtro por sección deja solo las imágenes de esa sección', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por sección' }));
    await user.click(await screen.findByRole('option', { name: 'CTA final' }));

    expect(await screen.findByText('maia.png')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('hero.png')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Hero' })).not.toBeInTheDocument();
  });

  it('rechaza en cliente un archivo de tipo no permitido y no ofrece SVG en el accept', async () => {
    // applyAccept desactivado para poder simular lo que haría un usuario que
    // fuerza el diálogo del sistema: el rechazo debe venir de nuestra validación.
    const user = userEvent.setup({ applyAccept: false });
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Subir imagen' }));
    const input = await screen.findByLabelText('Archivo de imagen');
    expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');

    await user.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

    expect(await screen.findByText(/tipo de archivo no permitido/i)).toBeInTheDocument();
    expect(screen.getByText('Ningún archivo seleccionado.')).toBeInTheDocument();
  });

  it('rechaza en cliente un archivo que excede los 5 MB', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Subir imagen' }));
    await user.upload(await screen.findByLabelText('Archivo de imagen'), hugePngFile());

    expect(await screen.findByText(/excede el tamaño máximo permitido \(5 MB\)/i)).toBeInTheDocument();
    expect(screen.getByText('Ningún archivo seleccionado.')).toBeInTheDocument();
  });

  it('sube una imagen válida y la añade a la sección elegida', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Subir imagen' }));
    await user.upload(await screen.findByLabelText('Archivo de imagen'), pngFile());

    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'CTA final' }));

    await user.type(screen.getByLabelText('Texto alternativo'), 'Captura del panel');
    const orden = screen.getByLabelText('Orden');
    await user.clear(orden);
    await user.type(orden, '2');

    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('nueva-foto.png')).toBeInTheDocument();
    const card = await screen.findByTestId('image-card-5');
    expect(within(card).getByText('Captura del panel')).toBeInTheDocument();
    expect(within(card).getByText('Orden 2')).toBeInTheDocument();
    expect(within(card).getByText('CTA final')).toBeInTheDocument();
    // Sin binario que mostrar, la maqueta lo dice en vez de pedirle nada al backend.
    expect(within(card).getByText('Vista previa no disponible')).toBeInTheDocument();
  });

  it('rechaza un orden que no sea un entero >= 0', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Subir imagen' }));
    await user.upload(await screen.findByLabelText('Archivo de imagen'), pngFile());
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));

    const orden = screen.getByLabelText('Orden');
    await user.clear(orden);
    await user.type(orden, '-3');
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('orden debe ser un entero >= 0')).toBeInTheDocument();
    expect(screen.queryByText('nueva-foto.png')).not.toBeInTheDocument();
  });

  it('la edición solo permite alt, orden y sección, y no ofrece reemplazar el archivo', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Editar hero.png' }));
    expect(await screen.findByText(/el archivo no se puede reemplazar/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reemplazar/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo de imagen')).not.toBeInTheDocument();

    const alt = screen.getByLabelText('Texto alternativo');
    await user.clear(alt);
    await user.type(alt, 'Alt corregido');
    const orden = screen.getByLabelText('Orden');
    await user.clear(orden);
    await user.type(orden, '7');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const card = await screen.findByTestId('image-card-1');
    expect(within(card).getByText('Alt corregido')).toBeInTheDocument();
    expect(within(card).getByText('Orden 7')).toBeInTheDocument();
  });

  it('cancelar la confirmación no borra la imagen', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero-3.png');

    await user.click(screen.getByRole('button', { name: 'Borrar hero-3.png' }));
    expect(await screen.findByText('¿Borrar imagen?')).toBeInTheDocument();
    expect(screen.getByText(/no hay papelera/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByText('¿Borrar imagen?')).not.toBeInTheDocument();
    });
    expect(screen.getByText('hero-3.png')).toBeInTheDocument();
  });

  it('confirmar el borrado quita la imagen de la galería', async () => {
    const user = userEvent.setup();
    renderImages();
    await screen.findByText('hero-3.png');

    await user.click(screen.getByRole('button', { name: 'Borrar hero-3.png' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    await waitFor(() => {
      expect(screen.queryByText('hero-3.png')).not.toBeInTheDocument();
    });
    expect(screen.getByText('hero.png')).toBeInTheDocument();
  });

  it('un editor ve la galería pero no las acciones de escritura, reservadas al rol admin', async () => {
    renderImages(editorUser);
    await screen.findByText('hero.png');

    expect(screen.queryByRole('button', { name: 'Subir imagen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar hero.png' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar hero.png' })).not.toBeInTheDocument();
    expect(screen.getByText(/reservado al rol administrador/i)).toBeInTheDocument();
  });
});
