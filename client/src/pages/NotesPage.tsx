import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useDialog } from '../components/DialogContext';
import { ModernSelect } from '../components/ModernSelect';
import type { Note, Vehicle } from '../lib/types';
import '../styles/notes.css';

export function NotesPage() {
  const dialog = useDialog();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.zones.list().then((zones) => {
      const all = (zones as any)._allVehicles as Vehicle[];
      setVehicles(all || []);
    });
    api.notes.list().then(setNotes);
  }, []);

  // Stesso ordine della pagina "Zone e Mezzi": ordinati per position,
  // con numero progressivo N° (1..34) accanto alla targa.
  const sortedVehicles = useMemo(
    () => [...vehicles].sort((a, b) => (a.position || 0) - (b.position || 0)),
    [vehicles]
  );

  const vehicleLabel = useMemo(() => {
    const map: Record<number, string> = {};
    sortedVehicles.forEach((v, i) => (map[v.id] = `${i + 1} · ${v.name}`));
    return map;
  }, [sortedVehicles]);

  const openForm = () => {
    setSelectedVehicle(null);
    setText('');
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const addNote = async () => {
    if (!selectedVehicle || !text.trim()) {
      dialog.alert('Errore', 'Seleziona una targa e scrivi il testo della nota');
      return;
    }
    const created = await api.notes.create(selectedVehicle, text.trim());
    setNotes((prev) => [created, ...prev]);
    setText('');
    setSelectedVehicle(null);
    setShowForm(false);
  };

  const removeNote = (id: number) => {
    dialog.confirm({
      title: 'Rimuovi Nota',
      message: 'Sei sicuro di voler rimuovere questa nota?',
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
      isDestructive: true,
      onConfirm: async () => {
        await api.notes.remove(id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
      },
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="notes-page">
      <div className="page-header">
        <h1>Note</h1>
        <p className="subtitle">Annota informazioni per ogni mezzo</p>
      </div>

      <div className="notes-container">
        <div className="notes-list-card">
          <h3>Note ({notes.length})</h3>
          {notes.length > 0 ? (
            <div className="notes-list">
              {notes.map((note) => (
                <div key={note.id} className="note-item">
                  <div className="note-content">
                    <div className="note-header">
                      <span className="note-plate">{vehicleLabel[note.vehicleId] || '—'}</span>
                      <span className="note-date">{formatDate(note.createdAt)}</span>
                    </div>
                    <div className="note-text">{note.text}</div>
                  </div>
                  <button className="danger" onClick={() => removeNote(note.id)}>
                    Rimuovi
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-message">Nessuna nota registrata</div>
          )}
        </div>
      </div>

      <button className="add-note-fab" onClick={openForm} aria-label="Aggiungi nota">
        +
      </button>

      {showForm && (
        <div className="dialog-overlay" onClick={closeForm}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>Aggiungi Nota</h2>
            </div>
            <div className="dialog-body">
              <div className="form-group">
                <label>Targa</label>
                <ModernSelect
                  value={selectedVehicle || ''}
                  onChange={(value) => setSelectedVehicle(value ? Number(value) : null)}
                  placeholder="-- Scegli una targa --"
                  options={[
                    { value: '', label: '-- Scegli una targa --' },
                    ...sortedVehicles.map((v) => ({ value: v.id, label: vehicleLabel[v.id] })),
                  ]}
                />
              </div>
              <div className="form-group">
                <label>Nota</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Scrivi qui la nota..."
                  rows={4}
                />
              </div>
            </div>
            <div className="dialog-footer">
              <button className="secondary" onClick={closeForm}>
                Annulla
              </button>
              <button className="primary" onClick={addNote}>
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
