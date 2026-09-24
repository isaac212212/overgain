import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  Users, 
  Plus, 
  Key, 
  ChevronRight, 
  Trophy, 
  MessageSquare, 
  Flame, 
  Share2,
  Copy,
  Check,
  Camera,
  Compass,
  Sparkles,
  UserPlus
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import './Groups.css';

export default function GroupsPage() {
  const { user } = useAuth();
  const { groups, allGroups, createGroup, joinGroup } = useData();
  const navigate = useNavigate();

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Forms
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [groupPin, setGroupPin] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joinPinInput, setJoinPinInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [joinError, setJoinError] = useState('');

  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setGroupPhoto(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Create Group
  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const newGroup = createGroup({
      name: groupName.trim(),
      description: groupDesc.trim() || 'Comunidade de treinos Overgain',
      photoUrl: groupPhoto || null,
      pin: groupPin.trim() || null,
      members: [
        {
          id: user?.id,
          name: user?.name || 'Atleta',
          username: user?.username || 'atleta',
          avatar: user?.avatar,
          role: 'admin',
          weeklyGoal: user?.weeklyGoal || 4,
          weeklyCheckins: 0,
          monthlyCheckins: 0,
          streak: 0,
          joinedAt: new Date().toISOString()
        }
      ]
    });

    setIsCreateModalOpen(false);
    setGroupName('');
    setGroupDesc('');
    setGroupPhoto(null);
    setGroupPin('');
    navigate(`/groups/${newGroup.id}`);
  };

  // Handle Join Group with Code & PIN
  const handleJoinGroup = (e) => {
    e.preventDefault();
    setJoinError('');
    const rawInput = inviteCodeInput.trim();
    if (!rawInput) return;

    const res = joinGroup(rawInput, {
      id: user?.id || 'usr_' + Date.now(),
      name: user?.name || 'João Silva',
      username: user?.username || 'joaosilva',
      avatar: user?.avatar || null,
      role: 'member',
      weeklyGoal: user?.weeklyGoal || 4,
      weeklyCheckins: 0,
      monthlyCheckins: 0,
      streak: 0,
      joinedAt: new Date().toISOString()
    }, joinPinInput);

    if (!res || !res.success) {
      setJoinError(res?.error || 'Código de convite não encontrado. Verifique o código com o criador do grupo!');
      return;
    }

    const targetGroupId = res.group?.id || res.foundGroup?.id;
    setIsJoinModalOpen(false);
    setInviteCodeInput('');
    setJoinPinInput('');
    if (targetGroupId) {
      navigate(`/groups/${targetGroupId}`);
    }
  };

  // 1-click Join from Explore
  const handleQuickJoin = (group) => {
    if (group.pin) {
      // Group has password/PIN, open modal to ask for PIN
      setInviteCodeInput(group.inviteCode);
      setJoinPinInput('');
      setJoinError('');
      setIsJoinModalOpen(true);
      return;
    }

    joinGroup(group.inviteCode, {
      id: user?.id,
      name: user?.name || 'Atleta',
      username: user?.username || 'atleta',
      avatar: user?.avatar,
      role: 'member',
      weeklyGoal: user?.weeklyGoal || 4,
      weeklyCheckins: 0,
      monthlyCheckins: 0,
      streak: 0,
      joinedAt: new Date().toISOString()
    });
    navigate(`/groups/${group.id}`);
  };

  // Copy code helper
  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Discover other public groups not joined yet
  const otherGroups = (allGroups || []).filter(g => !groups.some(myG => myG.id === g.id));

  return (
    <div className="groups-page animate-fade-in">
      {/* Header */}
      <div className="groups-header">
        <div>
          <h1 className="groups-title">Grupos & Competição Social</h1>
          <p className="groups-subtitle">
            Crie grupos com seus amigos, compartilhe o feed de fotos, compita no ranking e converse no chat exclusivo.
          </p>
        </div>

        <div className="groups-header-actions">
          <Button 
            variant="secondary" 
            icon={Key}
            onClick={() => { setIsJoinModalOpen(true); setJoinError(''); }}
          >
            Entrar com Código
          </Button>
          <Button 
            variant="primary" 
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Criar Novo Grupo
          </Button>
        </div>
      </div>

      {/* SECTION: MEUS GRUPOS */}
      <div className="groups-section">
        <h2 className="groups-section-heading">
          <Users size={20} className="text-accent" /> Meus Grupos ({groups.length})
        </h2>

        {groups.length === 0 ? (
          <Card className="groups-empty-card animate-fade-in" padding="xl">
            <div className="groups-empty-content">
              <div className="groups-empty-icon">
                <Users size={36} />
              </div>
              <h3>Você ainda não participa de nenhum grupo</h3>
              <p>
                Crie um grupo exclusivo para treinar com seus amigos ou entre em um grupo existente usando o código de convite!
              </p>
              <div className="groups-empty-actions">
                <Button variant="primary" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
                  Criar Meu Primeiro Grupo
                </Button>
                <Button variant="secondary" icon={Key} onClick={() => setIsJoinModalOpen(true)}>
                  Digitar Código de Convite
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="groups-list-grid">
            {groups.map(group => {
              const memberCount = group.members?.length || 1;
              const feedCount = group.feed?.length || 0;

              return (
                <Card 
                  key={group.id} 
                  className="group-card-interactive" 
                  padding="lg"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div className="group-card-top">
                    {group.photoUrl ? (
                      <img src={group.photoUrl} alt={group.name} className="group-avatar-img-card" />
                    ) : (
                      <div className="group-avatar-icon">
                        <Users size={24} />
                      </div>
                    )}
                    <div className="group-card-header-info">
                      <h3 className="group-name-title">{group.name}</h3>
                      <div className="group-code-pill" onClick={(e) => handleCopyCode(e, group.inviteCode)} title="Copiar código de convite">
                        <span>Cód: <strong>{group.inviteCode}</strong></span>
                        {copiedCode === group.inviteCode ? (
                          <Check size={12} className="text-success" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="group-card-description">{group.description}</p>

                  <div className="group-members-preview-bar">
                    <div className="group-avatar-stack">
                      {group.members?.slice(0, 4).map((m, idx) => (
                        <Avatar 
                          key={m.id || idx} 
                          src={m.avatar} 
                          name={m.name || 'Membro'} 
                          size="xs" 
                          className="stack-avatar" 
                        />
                      ))}
                    </div>
                    <span className="group-member-count-text">
                      {memberCount} membro(s)
                    </span>
                  </div>

                  {/* Card Footer */}
                  <div className="group-card-footer">
                    <div className="group-stats-badges">
                      <span className="g-stat-badge">
                        <Trophy size={13} /> Ranking
                      </span>
                      <span className="g-stat-badge">
                        <MessageSquare size={13} /> Chat
                      </span>
                    </div>
                    <div className="group-enter-link">
                      <span>Abrir</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: EXPLORAR OUTROS GRUPOS PÚBLICOS */}
      {otherGroups.length > 0 && (
        <div className="groups-section" style={{ marginTop: '32px' }}>
          <h2 className="groups-section-heading">
            <Compass size={20} className="text-accent" /> Explorar Outros Grupos da Comunidade ({otherGroups.length})
          </h2>

          <div className="groups-list-grid">
            {otherGroups.map(group => (
              <Card key={group.id} className="group-card-interactive" padding="lg">
                <div className="group-card-top">
                  {group.photoUrl ? (
                    <img src={group.photoUrl} alt={group.name} className="group-avatar-img-card" />
                  ) : (
                    <div className="group-avatar-icon">
                      <Users size={24} />
                    </div>
                  )}
                  <div className="group-card-header-info">
                    <h3 className="group-name-title">{group.name}</h3>
                    <span className="text-tertiary" style={{ fontSize: '0.8125rem' }}>
                      {group.members?.length || 1} membro(s)
                    </span>
                  </div>
                </div>

                <p className="group-card-description">{group.description}</p>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={UserPlus}
                    onClick={() => handleQuickJoin(group)}
                  >
                    Entrar no Grupo
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Criar Grupo de Treino"
          size="md"
        >
          <form className="modal-form" onSubmit={handleCreateGroup}>
            {/* Group Photo Selector */}
            <div className="group-photo-selector-field">
              <label className="input-label-sm">Foto de Capa do Grupo (Opcional)</label>
              
              <div className="group-photo-preview-wrap">
                {groupPhoto ? (
                  <img src={groupPhoto} alt="Prévia da foto do grupo" className="group-photo-preview" />
                ) : (
                  <div className="group-photo-blank-box" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={28} />
                    <span>Adicionar foto</span>
                  </div>
                )}
                
                <div className="group-photo-upload-actions">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Selecionar Imagem
                  </Button>
                  {groupPhoto && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setGroupPhoto(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                style={{ display: 'none' }} 
              />
            </div>

            <Input 
              label="Nome do Grupo *" 
              placeholder="Ex: Monstros da Madrugada, Projeto 80kg..." 
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              required
              autoFocus
            />

            <div className="input-group">
              <label className="input-label">Descrição & Regras do Grupo</label>
              <textarea 
                className="input-field textarea-field"
                placeholder="Ex: Treinos diários, postar foto de comprovação, sem faltar!"
                rows={3}
                value={groupDesc}
                onChange={e => setGroupDesc(e.target.value)}
              />
            </div>

            <Input 
              label="PIN de Acesso ao Grupo (Opcional)" 
              placeholder="Ex: 1234 (deixe em branco se for aberto)" 
              type="password"
              value={groupPin}
              onChange={e => setGroupPin(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              maxLength={8}
            />

            <div className="modal-actions-bar">
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={!groupName.trim()}>
                Criar Grupo
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Join Group Modal */}
      {isJoinModalOpen && (
        <Modal
          isOpen={isJoinModalOpen}
          onClose={() => { setIsJoinModalOpen(false); setJoinError(''); }}
          title="Entrar com Código de Convite"
          size="sm"
        >
          <form className="modal-form" onSubmit={handleJoinGroup}>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Peça o código de 6 letras do grupo para seu amigo ou administrador.
            </p>

            {joinError && (
              <div className="login-error-banner animate-fade-in" style={{ textAlign: 'left', fontSize: '0.8125rem' }}>
                {joinError}
              </div>
            )}

            <Input 
              label="Código de Convite"
              placeholder="Ex: X9K2LM"
              value={inviteCodeInput}
              onChange={e => { setInviteCodeInput(e.target.value.toUpperCase()); setJoinError(''); }}
              required
              autoFocus
              maxLength={8}
            />

            <Input 
              label="PIN do Grupo (Se exigido)"
              placeholder="Digite o PIN numérico do grupo"
              type="password"
              value={joinPinInput}
              onChange={e => { setJoinPinInput(e.target.value.replace(/[^0-9]/g, '')); setJoinError(''); }}
              inputMode="numeric"
              maxLength={8}
            />

            <div className="modal-actions-bar">
              <Button type="button" variant="ghost" onClick={() => setIsJoinModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={!inviteCodeInput.trim()}>
                Entrar no Grupo
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
