import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  Dumbbell, 
  Clock, 
  Weight, 
  Sparkles, 
  Flame, 
  Share2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { formatTime, formatDate } from '../utils/dateHelpers';
import './CheckInPage.css';

export default function CheckInPage() {
  const { user } = useAuth();
  const { routines, groups, addCheckin, addGroupFeedItem } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  // If passed via navigation state
  const initialRoutineId = location.state?.routineId || (routines[0]?.id || '');
  
  // State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState(initialRoutineId);
  const [duration, setDuration] = useState(55);
  const [volumeKg, setVolumeKg] = useState(1650);
  const [notes, setNotes] = useState('');
  const [shareToGroup, setShareToGroup] = useState(true);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdCheckin, setCreatedCheckin] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Selected routine object
  const currentRoutine = routines.find(r => r.id === selectedRoutineId);

  // Handle Photo selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Check-In
  const handleConfirmCheckIn = (e) => {
    e.preventDefault();

    // Foto obrigatória APENAS se for postar no feed do grupo
    if (shareToGroup && !photoPreview) {
      alert('A inclusão da foto de comprovação é OBRIGATÓRIA para validar e postar no Feed do Grupo! Desmarque o compartilhamento caso queira salvar apenas no seu histórico pessoal.');
      return;
    }

    const routineName = currentRoutine ? currentRoutine.name : 'Treino Livre';

    const newCheckinData = {
      routineId: selectedRoutineId,
      routineName,
      durationMinutes: Number(duration) || 50,
      totalVolumeKg: Number(volumeKg) || 0,
      totalReps: 140,
      photoUrl: photoPreview || null,
      notes: notes.trim() || 'Treino executado com sucesso e dedicação total!',
      userName: user?.name || 'João Silva',
      userAvatar: user?.avatar
    };

    const savedCheckin = addCheckin(newCheckinData);
    setCreatedCheckin(savedCheckin);

    // Share to first group feed if selected
    if (shareToGroup && groups.length > 0) {
      addGroupFeedItem(groups[0].id, {
        userId: user?.id || 'user_joao',
        userName: user?.name || 'João Silva',
        userAvatar: user?.avatar,
        routineName,
        durationMinutes: Number(duration) || 50,
        totalVolumeKg: Number(volumeKg) || 0,
        notes: notes.trim() || 'Ponto batido! Mais um dia concluído no plano.',
        photoUrl: photoPreview || null,
        likes: 1,
        comments: []
      });
    }

    setIsSuccessModalOpen(true);
  };

  return (
    <div className="checkin-page animate-fade-in">
      <div className="checkin-header">
        <div className="checkin-badge">
          <Flame size={14} className="checkin-flame" />
          <span>SISTEMA DE BATE PONTO</span>
        </div>
        <h1 className="checkin-title">Comprovar & Registrar Treino</h1>
        <p className="checkin-subtitle">
          Tire uma foto no espelho da academia ou dos equipamentos para comprovar sua presença.
        </p>
      </div>

      <form className="checkin-form-container" onSubmit={handleConfirmCheckIn}>
        <div className="checkin-grid">
          {/* Left Column: Photo Proof (MANDATORY REQUIREMENT) */}
          <div className="checkin-photo-section">
            <Card className="photo-card" padding="lg">
              <div className="photo-card-header">
                <h3>Foto Comprobatória</h3>
                <span className="photo-mandatory-tag" style={{ color: shareToGroup ? '#ef4444' : 'var(--text-secondary)' }}>
                  {shareToGroup ? '* Obrigatório para postar no grupo' : '(Opcional para registro pessoal)'}
                </span>
              </div>

              {photoPreview ? (
                <div className="photo-preview-box">
                  <img src={photoPreview} alt="Comprovante de Treino" className="photo-preview-img" />
                  
                  {/* Photo Overlay stamp */}
                  <div className="photo-stamp">
                    <span className="stamp-time">{formatTime(new Date())}</span>
                    <span className="stamp-date">{formatDate(new Date())}</span>
                    <span className="stamp-brand">OVERGAIN VERIFIED</span>
                  </div>

                  {/* Retake buttons */}
                  <div className="photo-retake-actions">
                    <button 
                      type="button" 
                      className="photo-retake-btn"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera size={14} /> Tirar Outra
                    </button>
                    <button 
                      type="button" 
                      className="photo-retake-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} /> Trocar Foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="photo-placeholder-box">
                  <div className="photo-action-icons">
                    <button 
                      type="button" 
                      className="photo-capture-main-btn"
                      onClick={() => cameraInputRef.current?.click()}
                      id="camera-capture-button"
                    >
                      <Camera size={36} />
                      <span className="btn-title">Tirar Foto Agora</span>
                      <span className="btn-desc">Câmera do Celular / Webcam</span>
                    </button>

                    <div className="photo-divider">ou</div>

                    <button 
                      type="button" 
                      className="photo-upload-gallery-btn"
                      onClick={() => fileInputRef.current?.click()}
                      id="gallery-upload-button"
                    >
                      <Upload size={20} />
                      <span>Carregar da Galeria</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input 
                ref={cameraInputRef}
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handlePhotoSelect} 
                style={{ display: 'none' }} 
              />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoSelect} 
                style={{ display: 'none' }} 
              />
            </Card>
          </div>

          {/* Right Column: Workout Info & Notes */}
          <div className="checkin-details-section">
            <Card className="details-card" padding="lg">
              <h3 className="details-section-title">Dados do Treino</h3>

              {/* Routine Selection */}
              <div className="form-group">
                <label className="form-label">
                  <Dumbbell size={16} /> Selecione a Rotina Executada
                </label>
                <div className="routine-select-chips">
                  {routines.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className={`routine-chip-btn ${selectedRoutineId === r.id ? 'active' : ''}`}
                      onClick={() => setSelectedRoutineId(r.id)}
                    >
                      <span className="chip-name">{r.name}</span>
                      <span className="chip-exercises">{r.exercises?.length || 0} exs</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`routine-chip-btn ${selectedRoutineId === 'free' ? 'active' : ''}`}
                    onClick={() => setSelectedRoutineId('free')}
                  >
                    <span className="chip-name">Treino Livre</span>
                    <span className="chip-exercises">Avulso</span>
                  </button>
                </div>
              </div>

              {/* Duration and Volume Inputs */}
              <div className="form-row-metrics">
                <div className="form-group">
                  <label className="form-label">
                    <Clock size={16} /> Duração (minutos)
                  </label>
                  <input 
                    type="number" 
                    className="metric-input"
                    min="1"
                    max="300"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Weight size={16} /> Volume Total (kg)
                  </label>
                  <input 
                    type="number" 
                    className="metric-input"
                    min="0"
                    step="10"
                    value={volumeKg}
                    onChange={e => setVolumeKg(e.target.value)}
                  />
                </div>
              </div>

              {/* Observation Field for the Session */}
              <div className="form-group">
                <label className="form-label">
                  Observações Gerais da Sessão
                </label>
                <textarea 
                  className="notes-textarea"
                  rows={3}
                  placeholder="Ex: Treino muito intenso hoje, aumentei a carga no supino e não senti incômodo no cotovelo. Manter evolução!"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Social sharing toggle */}
              {groups.length > 0 && (
                <div className="social-share-toggle">
                  <label className="share-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={shareToGroup}
                      onChange={e => setShareToGroup(e.target.checked)}
                      className="share-checkbox"
                    />
                    <div className="share-text-wrap">
                      <span className="share-main-text">
                        <Share2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Publicar foto e treino no grupo "{groups[0]?.name}"
                      </span>
                      <span className="share-sub-text">Seus amigos poderão curtir, comentar e somar pontos no ranking.</span>
                    </div>
                  </label>
                </div>
              )}

              {/* Big Confirm Button */}
              <button 
                type="submit" 
                className="confirm-checkin-btn"
                id="submit-checkin-btn"
              >
                <CheckCircle2 size={24} />
                <span>CONFIRMAR BATE PONTO</span>
              </button>
            </Card>
          </div>
        </div>
      </form>

      {/* Success Celebration Modal */}
      {isSuccessModalOpen && (
        <Modal
          isOpen={isSuccessModalOpen}
          onClose={() => {
            setIsSuccessModalOpen(false);
            navigate('/dashboard');
          }}
          size="md"
          showClose={false}
        >
          <div className="success-modal-content animate-scale-in">
            <div className="success-icon-badge">
              <Sparkles size={40} className="sparkle-icon" />
            </div>

            <h2 className="success-title">Ponto Batido com Sucesso! 🔥</h2>
            <p className="success-desc">
              Treino de <strong>{createdCheckin?.routineName}</strong> registrado e foto comprovada.
            </p>

            <div className="success-stats-box">
              <div className="success-stat-item">
                <span className="stat-label">Duração</span>
                <span className="stat-val">{createdCheckin?.durationMinutes} min</span>
              </div>
              <div className="success-stat-item">
                <span className="stat-label">Volume</span>
                <span className="stat-val">{createdCheckin?.totalVolumeKg} kg</span>
              </div>
              <div className="success-stat-item">
                <span className="stat-label">Frequência Semanal</span>
                <span className="stat-val highlight">+1 dia pago</span>
              </div>
            </div>

            {createdCheckin?.photoUrl && (
              <div className="success-photo-preview">
                <img src={createdCheckin.photoUrl} alt="Comprovante" />
              </div>
            )}

            <div className="success-actions">
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth 
                iconRight={ArrowRight}
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate('/dashboard');
                }}
              >
                Ir para o Dashboard
              </Button>
              <Button 
                variant="secondary" 
                size="md" 
                fullWidth 
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate('/groups');
                }}
              >
                Ver no Feed do Grupo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
