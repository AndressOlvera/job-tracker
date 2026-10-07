// Se ejecuta antes de cada archivo de pruebas (ver "setupFiles" en vite.config.ts).
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Desmonta lo que se renderizó en cada prueba, para que no se mezclen.
afterEach(() => {
  cleanup()
})

// jsdom no implementa showModal() ni close() de <dialog>. Se simulan con el
// atributo "open", que jsdom sí entiende (sin él, el diálogo queda oculto).
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
