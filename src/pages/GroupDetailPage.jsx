import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  Users, 
  ArrowLeft, 
  Trophy, 
  MessageSquare, 
  Flame, 
  Camera, 
  Heart, 
  Send, 
  Copy, 
  Check, 
  Clock, 
  Weight, 
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  TrendingUp,
  Dumbbell,
  ChevronRight,
  Info,
  Layers,
  StickyNote,
  Zap,
  Award,
  Activity,
  Ruler
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { formatTime, formatDate, formatRelative, getCalendarDaysCurrentOnly, isSameDay, getMonthName } from '../utils/dateHelpers';
import './Groups.css';

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    groups, 
    allGroups, 
    getGroupMessages, 
    sendMessage, 
    toggleFeedPostLike,
    addFeedPostComment,
    leaveGroup,
    deleteGroup,
    routines,
    checkins
  } = useData();

  const group = (allGroups || []).find(g => g.id === id) || (groups || []).find(g => g.id === id) || groups[0];

  // Tabs: 'feed' (Detalhes), 'ranking' (Classificações), 'members' (Membros), 'chat' (Bate-papo)
  const [activeTab, setActiveTab] = useState('feed');
  const [rankingPeriod, setRankingPeriod] = useState('weekly');
  const [rankingCategory, setRankingCategory] = useState('consistency'); // 'consistency' | 'prs' | 'streak' | 'volume' | 'strength'
  const [volumeMuscleGroup, setVolumeMuscleGroup] = useState('Geral');
  const [strengthMuscleGroup, setStrengthMuscleGroup] = useState('Peito');
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  // Modal inspection states
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const chatBottomRef = useRef(null);

  // Group messages
  const messages = getGroupMessages(group?.id || '');

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  if (!group) {
    return (
      <div className="group-detail-page">
        <p>Grupo não encontrado.</p>
        <Button onClick={() => navigate('/groups')}>Voltar para Grupos</Button>
      </div>
    );
  }

  // Handle chat message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    sendMessage(group.id, {
      userId: user?.id,
      userName: user?.name || 'Atleta',
      userAvatar: user?.avatar,
      text: chatInput.trim()
    });

    setChatInput('');
  };

  // Toggle like
  const handleToggleLike = (postId, e) => {
    e?.stopPropagation();
    if (group?.id) {
      toggleFeedPostLike(group.id, postId);
    }
  };

  // Add Comment
  const handleAddComment = (postId, e) => {
    e.preventDefault();
    if (!commentInput.trim() || !group?.id) return;
    addFeedPostComment(group.id, postId, commentInput);
    setCommentInput('');
  };

  // Copy code
  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const MUSCLE_GROUPS_LIST = ['Geral', 'Peito', 'Costas', 'Levantamento Terra', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Panturrilha'];
  const STRENGTH_MUSCLE_GROUPS = ['Peito', 'Costas', 'Levantamento Terra', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Panturrilha'];

  // Start of current week (Monday 00:00:00)
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // User's real workouts this week (excluding cardio)
  const userThisWeekWorkouts = (checkins || []).filter(c => {
    const d = new Date(c.date);
    return d >= startOfWeek && c.type !== 'cardio';
  });

  // User's real cardios this week
  const userThisWeekCardios = (checkins || []).filter(c => {
    const d = new Date(c.date);
    return d >= startOfWeek && c.type === 'cardio';
  });

  // Calculate real completed sets for the user in the selected group
  const calculateUserWeeklySets = (groupName) => {
    let total = 0;
    userThisWeekWorkouts.forEach(c => {
      if (groupName === 'Geral') {
        if (c.totalSets !== undefined && c.totalSets !== null) {
          total += c.totalSets;
        } else if (c.exercises && c.exercises.length > 0) {
          c.exercises.forEach(ex => {
            total += (ex.sets || []).filter(s => s.completed !== false).length;
          });
        }
      } else {
        if (c.exercises && c.exercises.length > 0) {
          c.exercises.forEach(ex => {
            const exName = (ex.name || '').toLowerCase();
            const exMg = (ex.muscleGroup || '').toLowerCase();
            let matches = false;

            if (groupName === 'Levantamento Terra') {
              matches = exName.includes('terra') || exName.includes('deadlift') || exMg.includes('terra');
            } else if (groupName === 'Peito') {
              matches = exMg === 'peito' || exName.includes('supino') || exName.includes('crucifixo') || exName.includes('cross') || exName.includes('peitoral');
            } else if (groupName === 'Costas') {
              matches = (exMg === 'costas' || exName.includes('remada') || exName.includes('puxada') || exName.includes('pulldown') || exName.includes('barra fixa')) && !exName.includes('terra');
            } else if (groupName === 'Pernas') {
              matches = exMg === 'pernas' || exName.includes('agachamento') || exName.includes('leg press') || exName.includes('extensora') || exName.includes('flexora') || exName.includes('hack') || exName.includes('afundo') || exName.includes('stiff');
            } else if (groupName === 'Ombros') {
              matches = exMg === 'ombros' || exName.includes('desenvolvimento') || exName.includes('lateral') || exName.includes('frontal') || exName.includes('ombro');
            } else if (groupName === 'Bíceps') {
              matches = exMg === 'bíceps' || exMg === 'biceps' || exName.includes('rosca') || exName.includes('biceps');
            } else if (groupName === 'Tríceps') {
              matches = exMg === 'tríceps' || exMg === 'triceps' || exName.includes('triceps') || exName.includes('testa') || exName.includes('corda') || exName.includes('pulley');
            } else if (groupName === 'Panturrilha') {
              matches = exMg === 'panturrilha' || exName.includes('panturrilha') || exName.includes('gemeos');
            }

            if (matches) {
              total += (ex.sets || []).filter(s => s.completed !== false).length;
            }
          });
        }
      }
    });
    return total;
  };

  const MOCK_MEMBER_SETS = {
    'user_lucas': {
      'Geral': 24,
      'Peito': 8,
      'Costas': 6,
      'Levantamento Terra': 4,
      'Pernas': 6,
      'Ombros': 5,
      'Bíceps': 5,
      'Tríceps': 5,
      'Panturrilha': 4,
    },
    'user_joao': {
      'Geral': 22,
      'Peito': 6,
      'Costas': 6,
      'Levantamento Terra': 5,
      'Pernas': 8,
      'Ombros': 4,
      'Bíceps': 4,
      'Tríceps': 4,
      'Panturrilha': 5,
    },
    'user_mari': {
      'Geral': 20,
      'Peito': 4,
      'Costas': 5,
      'Levantamento Terra': 4,
      'Pernas': 10,
      'Ombros': 3,
      'Bíceps': 3,
      'Tríceps': 3,
      'Panturrilha': 4,
    },
    'user_gabriel': {
      'Geral': 16,
      'Peito': 5,
      'Costas': 6,
      'Levantamento Terra': 3,
      'Pernas': 4,
      'Ombros': 4,
      'Bíceps': 5,
      'Tríceps': 4,
      'Panturrilha': 3,
    },
    'user_pedro': {
      'Geral': 12,
      'Peito': 4,
      'Costas': 4,
      'Levantamento Terra': 3,
      'Pernas': 4,
      'Ombros': 3,
      'Bíceps': 3,
      'Tríceps': 3,
      'Panturrilha': 2,
    },
  };

  const getMemberWeeklySets = (m, groupName) => {
    if (m.id === user?.id) {
      return calculateUserWeeklySets(groupName);
    }
    const memberSets = MOCK_MEMBER_SETS[m.id];
    if (memberSets && memberSets[groupName] !== undefined) {
      return memberSets[groupName];
    }
    return groupName === 'Geral' ? 12 : 3;
  };

  // Get max recorded lift in muscle group
  const getMemberStrength = (m, groupName) => {
    if (m.id === user?.id) {
      let maxLift = null;
      (checkins || []).forEach(c => {
        (c.exercises || []).forEach(ex => {
          const exName = (ex.name || '').toLowerCase();
          const exMg = (ex.muscleGroup || '').toLowerCase();
          let matches = false;

          if (groupName === 'Levantamento Terra') {
            matches = exName.includes('terra') || exName.includes('deadlift') || exMg.includes('terra');
          } else if (groupName === 'Peito') {
            matches = exMg === 'peito' || exName.includes('supino') || exName.includes('crucifixo');
          } else if (groupName === 'Costas') {
            matches = (exMg === 'costas' || exName.includes('remada') || exName.includes('puxada') || exName.includes('pulldown') || exName.includes('barra fixa')) && !exName.includes('terra');
          } else if (groupName === 'Pernas') {
            matches = exMg === 'pernas' || exName.includes('agachamento') || exName.includes('leg press') || exName.includes('hack');
          } else if (groupName === 'Ombros') {
            matches = exMg === 'ombros' || exName.includes('desenvolvimento') || exName.includes('lateral');
          } else if (groupName === 'Bíceps') {
            matches = exMg === 'bíceps' || exMg === 'biceps' || exName.includes('rosca');
          } else if (groupName === 'Tríceps') {
            matches = exMg === 'tríceps' || exMg === 'triceps' || exName.includes('triceps') || exName.includes('testa') || exName.includes('corda');
          } else if (groupName === 'Panturrilha') {
            matches = exMg === 'panturrilha' || exName.includes('panturrilha') || exName.includes('gemeos');
          }

          if (matches) {
            (ex.sets || []).forEach(s => {
              const w = Number(s.weight) || 0;
              if (w > 0 && (!maxLift || w > maxLift.weight)) {
                maxLift = { name: ex.name, weight: w };
              }
            });
          }
        });
      });
      return maxLift || { name: 'Sem registro', weight: 0 };
    }

    const table = {
      'Levantamento Terra': {
        'user_joao': { name: 'Levantamento Terra Convencional', weight: 180 },
        'user_lucas': { name: 'Levantamento Terra', weight: 170 },
        'user_gabriel': { name: 'Levantamento Terra Sumô', weight: 155 },
        'user_pedro': { name: 'Levantamento Terra', weight: 110 },
        'user_mari': { name: 'Levantamento Terra Romeno', weight: 95 },
      },
      'Peito': {
        'user_lucas': { name: 'Supino Reto', weight: 110 },
        'user_joao': { name: 'Supino Inclinado', weight: 100 },
        'user_mari': { name: 'Supino Reto Halteres', weight: 55 },
        'user_gabriel': { name: 'Crucifixo Máquina', weight: 75 },
        'user_pedro': { name: 'Supino Reto', weight: 70 },
      },
      'Costas': {
        'user_lucas': { name: 'Puxada Alta', weight: 95 },
        'user_gabriel': { name: 'Remada Curvada', weight: 90 },
        'user_joao': { name: 'Puxada Aberta', weight: 85 },
        'user_mari': { name: 'Remada Baixa Triângulo', weight: 60 },
        'user_pedro': { name: 'Puxada Frontal', weight: 65 },
      },
      'Bíceps': {
        'user_lucas': { name: 'Rosca Direta Barra W', weight: 42 },
        'user_gabriel': { name: 'Rosca Scott Halteres', weight: 38 },
        'user_joao': { name: 'Rosca Alternada', weight: 36 },
        'user_mari': { name: 'Rosca Martelo', weight: 24 },
        'user_pedro': { name: 'Rosca Direta', weight: 28 },
      },
      'Tríceps': {
        'user_lucas': { name: 'Tríceps Testa', weight: 46 },
        'user_joao': { name: 'Tríceps Corda', weight: 40 },
        'user_gabriel': { name: 'Tríceps Francês', weight: 34 },
        'user_mari': { name: 'Tríceps Pulley', weight: 32 },
        'user_pedro': { name: 'Tríceps Corda', weight: 26 },
      },
      'Ombros': {
        'user_lucas': { name: 'Desenvolvimento Halteres', weight: 65 },
        'user_joao': { name: 'Desenvolvimento Barra', weight: 60 },
        'user_gabriel': { name: 'Elevação Lateral', weight: 18 },
        'user_mari': { name: 'Elevação Lateral Halteres', weight: 12 },
        'user_pedro': { name: 'Desenvolvimento Máquina', weight: 45 },
      },
      'Pernas': {
        'user_joao': { name: 'Leg Press 45º', weight: 280 },
        'user_mari': { name: 'Hip Thrust / Elevação Pélvica', weight: 220 },
        'user_lucas': { name: 'Agachamento Livre', weight: 140 },
        'user_gabriel': { name: 'Cadeira Extensora', weight: 95 },
        'user_pedro': { name: 'Leg Press 45º', weight: 160 },
      },
      'Panturrilha': {
        'user_joao': { name: 'Panturrilha no Leg Press', weight: 180 },
        'user_lucas': { name: 'Gêmeos Sentado', weight: 75 },
        'user_mari': { name: 'Panturrilha em Pé Máquina', weight: 70 },
        'user_gabriel': { name: 'Gêmeos Sentado', weight: 55 },
        'user_pedro': { name: 'Panturrilha em Pé', weight: 50 },
      }
    };
    const groupData = table[groupName] || table['Peito'];
    return groupData[m.id] || { name: `${groupName}`, weight: 0 };
  };

  // Enriched members data for fair rankings
  const enrichedMembers = (group.members || []).map(m => {
    const isSelf = m.id === user?.id;
    const weeklyGoal = isSelf ? (user?.weeklyGoal || m.weeklyGoal || 4) : (m.weeklyGoal || 4);
    const weeklyCheckins = isSelf ? userThisWeekWorkouts.length : (m.weeklyCheckins || 0);
    const weeklyCardios = isSelf ? userThisWeekCardios.length : (
      m.id === 'user_lucas' ? 3 :
      m.id === 'user_mari' ? 4 :
      m.id === 'user_joao' ? 2 :
      m.id === 'user_gabriel' ? 2 :
      1
    );
    const consistencyRate = Math.min(100, Math.round((weeklyCheckins / weeklyGoal) * 100));

    const streak = isSelf ? (user?.streak || 0) : (m.streak || 0);

    const prsCount = isSelf ? (user?.prsCount || 0) : (m.prsCount || (
      m.id === 'user_lucas' ? 22 :
      m.id === 'user_joao' ? 20 :
      m.id === 'user_mari' ? 15 :
      m.id === 'user_gabriel' ? 11 :
      8
    ));

    const currentGroupSets = getMemberWeeklySets(m, volumeMuscleGroup);
    const currentStrengthExercise = getMemberStrength(m, strengthMuscleGroup);

    return {
      ...m,
      weeklyGoal,
      weeklyCheckins,
      weeklyCardios,
      consistencyRate,
      streak,
      prsCount,
      currentGroupSets,
      currentStrengthExercise
    };
  });

  // Sorted members for ranking depending on category
  const sortedMembers = [...enrichedMembers].sort((a, b) => {
    if (rankingCategory === 'consistency') {
      if (b.consistencyRate !== a.consistencyRate) {
        return b.consistencyRate - a.consistencyRate;
      }
      return (b.streak || 0) - (a.streak || 0);
    }
    if (rankingCategory === 'volume') {
      return (b.currentGroupSets || 0) - (a.currentGroupSets || 0);
    }
    if (rankingCategory === 'strength') {
      return (b.currentStrengthExercise?.weight || 0) - (a.currentStrengthExercise?.weight || 0);
    }
    if (rankingCategory === 'cardio') {
      return (b.weeklyCardios || 0) - (a.weeklyCardios || 0);
    }
    if (rankingCategory === 'prs') {
      return (b.prsCount || 0) - (a.prsCount || 0);
    }
    if (rankingCategory === 'streak') {
      return (b.streak || 0) - (a.streak || 0);
    }
    return (b.weeklyCheckins || 0) - (a.weeklyCheckins || 0);
  });

  const leaderMember = sortedMembers[0] || { name: 'Líder', weeklyCheckins: 5 };
  const userMember = enrichedMembers.find(m => m.id === user?.id) || { name: 'Você', weeklyCheckins: userThisWeekWorkouts.length, weeklyGoal: user?.weeklyGoal || 4 };

  // Helper to format date groups like "Ontem", "sábado, set. 19"
  const getDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const nowLabel = new Date();
    const diffDays = Math.floor((nowLabel - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group feed posts by date label
  const groupedFeed = (group.feed || []).reduce((acc, post) => {
    const label = getDateLabel(post.date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(post);
    return acc;
  }, {});

  return (
    <div className="group-detail-page animate-fade-in">
      {/* Top Bar with Group Photo */}
      <header className="group-top-bar-v3">
        <button className="top-back-btn" onClick={() => navigate('/groups')}>
          <ArrowLeft size={20} />
          <span>Grupos</span>
        </button>

        <div className="top-group-title-wrap">
          {group.photoUrl ? (
            <img src={group.photoUrl} alt={group.name} className="top-group-photo-thumb" />
          ) : (
            <div className="top-group-avatar-icon">
              <Users size={18} />
            </div>
          )}
          <h2 className="top-group-title">{group.name}</h2>
        </div>

        <button className="top-invite-btn" onClick={handleCopyInviteCode} title="Copiar código">
          {copiedCode ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          <span>{group.inviteCode}</span>
        </button>
      </header>

      {/* Leader Comparison Pill matching Image 3 */}
      <div className="leader-comparison-card">
        <div 
          className="leader-pill-item"
          onClick={() => setSelectedMember(leaderMember)}
        >
          <Avatar src={leaderMember.avatar} name={leaderMember.name} size="sm" />
          <div className="leader-pill-meta">
            <strong>{leaderMember.weeklyCheckins || 5}</strong>
            <span>Líder ({leaderMember.name?.split(' ')[0]})</span>
          </div>
        </div>

        <div className="leader-pill-divider" />

        <div 
          className="leader-pill-item"
          onClick={() => setSelectedMember(userMember)}
        >
          <Avatar src={user?.avatar} name={user?.name} size="sm" />
          <div className="leader-pill-meta">
            <strong>{userMember.weeklyCheckins || 0}</strong>
            <span>Você</span>
          </div>
        </div>
      </div>

      {/* 4 Tabs: Detalhes, Classificações, Membros, Bate-papo */}
      <nav className="group-subtabs-nav">
        <button 
          className={`subtab-btn ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          <Layers size={16} />
          <span>Detalhes (Feed)</span>
        </button>

        <button 
          className={`subtab-btn ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          <Trophy size={16} />
          <span>Classificações</span>
        </button>

        <button 
          className={`subtab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={16} />
          <span>Membros ({enrichedMembers.length})</span>
        </button>

        <button 
          className={`subtab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          <span>Bate-papo</span>
        </button>
      </nav>

      {/* TAB 1: FEED NO ESTILO DA IMAGEM 3 */}
      {activeTab === 'feed' && (
        <div className="group-tab-container animate-fade-in">
          {Object.keys(groupedFeed).length === 0 ? (
            <Card className="empty-state-card" padding="lg">
              <Camera size={44} className="text-muted" />
              <h3>Nenhum treino no feed ainda</h3>
              <p>Inicie uma rotina para que o treino apareça aqui com foto e cargas!</p>
              <Button 
                variant="primary" 
                onClick={() => navigate('/routines')}
                className="mt-md"
              >
                Começar Rotina
              </Button>
            </Card>
          ) : (
            <div className="feed-sections-stack">
              {Object.entries(groupedFeed).map(([dateLabel, posts]) => (
                <div key={dateLabel} className="feed-date-group">
                  <span className="feed-date-header">{dateLabel}</span>

                  <div className="feed-cards-compact-list">
                    {posts.map(post => {
                      const isLiked = post.likedBy?.includes(user?.id);
                      const likesCount = post.likes || post.likedBy?.length || 0;
                      const isAbsence = post.type === 'justified_absence';
                      const isCardio = post.type === 'cardio';

                      if (isAbsence) {
                        return (
                          <div 
                            key={post.id}
                            className="feed-compact-card feed-card-absence"
                            style={{
                              borderLeft: '3px solid #eab308',
                              background: 'rgba(234, 179, 8, 0.05)'
                            }}
                          >
                            <div className="feed-compact-thumbnail-wrap" style={{
                              background: 'rgba(234, 179, 8, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#eab308'
                            }}>
                              <CalendarIcon size={22} />
                            </div>

                            <div className="feed-compact-body">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(234, 179, 8, 0.2)',
                                  color: '#eab308'
                                }}>
                                  {post.actionType === 'postpone' ? 'TREINO ADIADO' : 'TREINO CANCELADO'}
                                </span>
                              </div>
                              <h3 className="feed-compact-title" style={{ fontSize: '0.875rem' }}>
                                Falta Justificada: {post.reason} {post.customReason ? `(${post.customReason})` : ''}
                              </h3>
                              <div className="feed-compact-author-row">
                                <Avatar src={post.userAvatar} name={post.userName} size="sm" />
                                <span className="feed-compact-author-name">{post.userName}</span>
                              </div>
                            </div>

                            <div className="feed-compact-right">
                              <span className="feed-compact-time">{formatTime(post.date)}</span>
                            </div>
                          </div>
                        );
                      }

                      if (isCardio) {
                        return (
                          <div 
                            key={post.id}
                            className="feed-compact-card feed-card-cardio"
                            style={{
                              borderLeft: '3px solid #f59e0b'
                            }}
                            onClick={() => setSelectedPost(post)}
                          >
                            <div className="feed-compact-thumbnail-wrap" style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#f59e0b'
                            }}>
                              {post.photoUrl ? (
                                <img src={post.photoUrl} alt="Cardio" className="feed-compact-thumbnail" />
                              ) : (
                                <span style={{ fontSize: '1.4rem' }}>🏃</span>
                              )}
                            </div>

                            <div className="feed-compact-body">
                              <h3 className="feed-compact-title">
                                🏃 {post.title || post.routineName || 'Sessão de Cardio'}
                              </h3>
                              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>
                                {post.durationMinutes} min {post.distanceKm > 0 ? `· ${post.distanceKm} km ` : ''}{post.calories > 0 ? `· ${post.calories} kcal` : ''}
                              </div>
                              <div 
                                className="feed-compact-author-row"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const member = enrichedMembers.find(m => m.name === post.userName) || {
                                    name: post.userName,
                                    avatar: post.userAvatar,
                                    weeklyCheckins: 0,
                                    streak: 0
                                  };
                                  setSelectedMember(member);
                                }}
                              >
                                <Avatar src={post.userAvatar} name={post.userName} size="sm" />
                                <span className="feed-compact-author-name">{post.userName}</span>
                              </div>
                            </div>

                            <div className="feed-compact-right">
                              <span className="feed-compact-time">{formatTime(post.date)}</span>
                              <button 
                                className={`feed-compact-like-btn ${isLiked ? 'liked' : ''}`}
                                onClick={(e) => handleToggleLike(post.id, e)}
                                title={isLiked ? 'Descurtir' : 'Curtir'}
                              >
                                <Heart size={14} fill={isLiked ? '#ef4444' : 'none'} />
                                {likesCount > 0 && <span className="like-count-badge">{likesCount}</span>}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={post.id}
                          className="feed-compact-card"
                          onClick={() => setSelectedPost(post)}
                        >
                          {/* Square Thumbnail on the left matching Image 3 */}
                          <div className="feed-compact-thumbnail-wrap">
                            <img 
                              src={post.photoUrl || 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&auto=format&fit=crop&q=80'} 
                              alt="Foto do treino" 
                              className="feed-compact-thumbnail"
                            />
                          </div>

                          {/* Post info: Title, Author Avatar + Name matching Image 3 */}
                          <div className="feed-compact-body">
                            <h3 className="feed-compact-title">
                              {post.title || post.routineName || 'Treino'}
                            </h3>
                            <div 
                              className="feed-compact-author-row"
                              onClick={(e) => {
                                e.stopPropagation();
                                const member = enrichedMembers.find(m => m.name === post.userName) || {
                                  name: post.userName,
                                  avatar: post.userAvatar,
                                  weeklyCheckins: 0,
                                  streak: 0
                                };
                                setSelectedMember(member);
                              }}
                            >
                              <Avatar src={post.userAvatar} name={post.userName} size="sm" />
                              <span className="feed-compact-author-name">{post.userName}</span>
                            </div>
                          </div>

                          {/* Timestamp on right matching Image 3 */}
                          <div className="feed-compact-right">
                            <span className="feed-compact-time">{formatTime(post.date)}</span>
                            <button 
                              className={`feed-compact-like-btn ${isLiked ? 'liked' : ''}`}
                              onClick={(e) => handleToggleLike(post.id, e)}
                              title={isLiked ? 'Descurtir' : 'Curtir'}
                            >
                              <Heart size={14} fill={isLiked ? '#ef4444' : 'none'} />
                              {likesCount > 0 && <span className="like-count-badge">{likesCount}</span>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Floating action button (+) to quickly start routine */}
          <button 
            className="fab-start-workout-btn"
            onClick={() => navigate('/routines')}
            title="Começar Novo Treino"
          >
            <Plus size={26} />
          </button>
        </div>
      )}

      {/* TAB 2: CLASSIFICAÇÕES (RANKING COM CATEGORIAS E GRUPOS MUSCULARES) */}
      {activeTab === 'ranking' && (
        <div className="group-tab-container ranking-tab-content">
          {/* Sub-categories selector */}
          <div className="ranking-category-tabs">
            <button 
              className={`ranking-cat-btn ${rankingCategory === 'consistency' ? 'active' : ''}`}
              onClick={() => setRankingCategory('consistency')}
            >
              <Flame size={15} />
              <span>Semanas sem Faltar</span>
            </button>
            <button 
              className={`ranking-cat-btn ${rankingCategory === 'volume' ? 'active' : ''}`}
              onClick={() => setRankingCategory('volume')}
            >
              <Layers size={15} />
              <span>Séries Semanais</span>
            </button>
            <button 
              className={`ranking-cat-btn ${rankingCategory === 'strength' ? 'active' : ''}`}
              onClick={() => setRankingCategory('strength')}
            >
              <Dumbbell size={15} />
              <span>Mais Forte</span>
            </button>
            <button 
              className={`ranking-cat-btn ${rankingCategory === 'cardio' ? 'active' : ''}`}
              onClick={() => setRankingCategory('cardio')}
            >
              <Activity size={15} />
              <span>Cardio Semanal</span>
            </button>
            <button 
              className={`ranking-cat-btn ${rankingCategory === 'prs' ? 'active' : ''}`}
              onClick={() => setRankingCategory('prs')}
            >
              <Award size={15} />
              <span>Mais PRs Batidos</span>
            </button>
            <button 
              className={`ranking-cat-btn ${rankingCategory === 'streak' ? 'active' : ''}`}
              onClick={() => setRankingCategory('streak')}
            >
              <Zap size={15} />
              <span>Dias Seguidos</span>
            </button>
          </div>

          {/* Sub-selector for Sets/Volume by Muscle Group */}
          {rankingCategory === 'volume' && (
            <div className="muscle-group-subselector animate-fade-in" style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              padding: '10px 4px',
              marginBottom: 16
            }}>
              {MUSCLE_GROUPS_LIST.map(mg => (
                <button
                  key={mg}
                  type="button"
                  onClick={() => setVolumeMuscleGroup(mg)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: volumeMuscleGroup === mg ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                    background: volumeMuscleGroup === mg ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                    color: volumeMuscleGroup === mg ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mg === 'Geral' ? '🔥 Todas as Séries' : mg === 'Levantamento Terra' ? '🏋️ Terra / Deadlift' : mg}
                </button>
              ))}
            </div>
          )}

          {/* Sub-selector for Strength by Muscle Group */}
          {rankingCategory === 'strength' && (
            <div className="muscle-group-subselector animate-fade-in" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 16
            }}>
              <div style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                padding: '4px 2px'
              }}>
                {STRENGTH_MUSCLE_GROUPS.map(mg => (
                  <button
                    key={mg}
                    type="button"
                    onClick={() => setStrengthMuscleGroup(mg)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      border: strengthMuscleGroup === mg ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                      background: strengthMuscleGroup === mg ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                      color: strengthMuscleGroup === mg ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🏋️ {mg === 'Levantamento Terra' ? 'Terra / Deadlift' : mg}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                ℹ️ Exibição informativa de cargas máximas registradas para <strong>{strengthMuscleGroup === 'Levantamento Terra' ? 'Levantamento Terra (Deadlift)' : strengthMuscleGroup}</strong>. Não é uma disputa direta, pois os exercícios e aparelhos diferem entre atletas.
              </span>
            </div>
          )}

          <div className="ranking-podium">
            {sortedMembers.slice(0, 3).map((member, idx) => {
              const rank = idx + 1;

              return (
                <div 
                  key={member.id} 
                  className={`podium-card podium-rank-${rank}`}
                  onClick={() => setSelectedMember(member)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="podium-rank-badge">
                    {rank === 1 && '🥇 1º'}
                    {rank === 2 && '🥈 2º'}
                    {rank === 3 && '🥉 3º'}
                  </div>
                  <Avatar src={member.avatar} name={member.name} size="lg" />
                  <span className="podium-name">{member.name}</span>

                  {/* Dynamic metric based on category */}
                  <div className="podium-score">
                    {rankingCategory === 'consistency' && (
                      <>
                        <strong>{member.consistencyRate}%</strong>
                        <span>{member.weeklyCheckins}/{member.weeklyGoal} meta</span>
                      </>
                    )}
                    {rankingCategory === 'prs' && (
                      <>
                        <strong>{member.prsCount}</strong>
                        <span>PRs batidos 🏆</span>
                      </>
                    )}
                    {rankingCategory === 'streak' && (
                      <>
                        <strong>{member.streak}d</strong>
                        <span>dias seguidos ⚡</span>
                      </>
                    )}
                    {rankingCategory === 'volume' && (
                      <>
                        <strong>{member.currentGroupSets || 0}</strong>
                        <span>{member.currentGroupSets === 1 ? 'série feita' : 'séries na semana'} ⚡</span>
                      </>
                    )}
                    {rankingCategory === 'strength' && (
                      <>
                        <strong>{member.currentStrengthExercise?.weight > 0 ? `${member.currentStrengthExercise.weight} kg` : '—'}</strong>
                        <span className="podium-sublabel">{member.currentStrengthExercise?.weight > 0 ? member.currentStrengthExercise?.name : 'Sem registro'}</span>
                      </>
                    )}
                    {rankingCategory === 'cardio' && (
                      <>
                        <strong>{member.weeklyCardios || 0}</strong>
                        <span>{member.weeklyCardios === 1 ? 'cardio na semana' : 'cardios na semana'} 🏃</span>
                      </>
                    )}
                  </div>

                  {member.streak > 0 && (
                    <span className="podium-streak">
                      <Flame size={12} /> {member.streak}d streak
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <Card className="ranking-table-card" padding="none">
            <div className="ranking-table-header">
              <span className="col-rank">Pos</span>
              <span className="col-user">Atleta</span>
              <span className="col-streak">Streak</span>
              <span className="col-checkins">
                {rankingCategory === 'consistency' && 'Meta Cumprida'}
                {rankingCategory === 'prs' && 'Recordes Pessoais (PRs)'}
                {rankingCategory === 'streak' && 'Sequência Diária'}
                {rankingCategory === 'volume' && `Séries Semanais (${volumeMuscleGroup === 'Levantamento Terra' ? 'Terra/Deadlift' : volumeMuscleGroup})`}
                {rankingCategory === 'strength' && `Maior Carga (${strengthMuscleGroup === 'Levantamento Terra' ? 'Terra/Deadlift' : strengthMuscleGroup})`}
                {rankingCategory === 'cardio' && 'Cardios Realizados'}
              </span>
            </div>

            <div className="ranking-table-body">
              {sortedMembers.map((member, idx) => {
                const isCurrentUser = member.id === user?.id;

                return (
                  <div 
                    key={member.id} 
                    className={`ranking-table-row ${isCurrentUser ? 'ranking-row-current' : ''}`}
                    onClick={() => setSelectedMember(member)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="col-rank">#{idx + 1}</span>
                    <div className="col-user ranking-user-cell">
                      <Avatar src={member.avatar} name={member.name} size="sm" />
                      <div className="ranking-user-meta">
                        <span className="ranking-name-text">
                          {member.name} {isCurrentUser && <span className="you-pill">Você</span>}
                        </span>
                        <span className="ranking-username">@{member.username}</span>
                      </div>
                    </div>
                    <div className="col-streak">
                      {member.streak > 0 ? (
                        <span className="streak-tag"><Flame size={12} /> {member.streak}d</span>
                      ) : '-'}
                    </div>
                    <div className="col-checkins">
                      {rankingCategory === 'consistency' && (
                        <span className="checkins-badge-pill">
                          {member.consistencyRate}% ({member.weeklyCheckins}/{member.weeklyGoal}d)
                        </span>
                      )}
                      {rankingCategory === 'prs' && (
                        <span className="checkins-badge-pill pr-badge-highlight">
                          🏆 {member.prsCount} PRs batidos
                        </span>
                      )}
                      {rankingCategory === 'streak' && (
                        <span className="checkins-badge-pill streak-badge-highlight">
                          ⚡ {member.streak} dias seguidos
                        </span>
                      )}
                      {rankingCategory === 'volume' && (
                        <span className="checkins-badge-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                          <strong>{member.currentGroupSets || 0}</strong> {member.currentGroupSets === 1 ? 'série' : 'séries'}
                        </span>
                      )}
                      {rankingCategory === 'strength' && (
                        <span className="checkins-badge-pill">
                          {member.currentStrengthExercise?.weight > 0 ? (
                            <><strong>{member.currentStrengthExercise.weight} kg</strong> · {member.currentStrengthExercise.name}</>
                          ) : (
                            <span className="text-muted">— Sem registro</span>
                          )}
                        </span>
                      )}
                      {rankingCategory === 'cardio' && (
                        <span className="checkins-badge-pill" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                          🏃 <strong>{member.weeklyCardios || 0}</strong> {member.weeklyCardios === 1 ? 'cardio' : 'cardios'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: MEMBROS DO GRUPO (VER MEMBROS E PERFIS) */}
      {activeTab === 'members' && (
        <div className="group-tab-container members-tab-content animate-fade-in">
          <div className="members-header-banner" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Membros do Grupo ({enrichedMembers.length})
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Clique em qualquer membro para ver suas rotinas, evolução e calendário de treinos.
              </p>
            </div>
            {group.pin && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '4px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-secondary)'
              }}>
                🔒 Grupo com Senha PIN
              </span>
            )}
          </div>

          <div className="members-grid-cards" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12
          }}>
            {enrichedMembers.map(member => {
              const isCurrentUser = member.id === user?.id;
              const isAdmin = member.role === 'admin' || member.id === group.createdBy || member.id === 'user_lucas';

              return (
                <Card 
                  key={member.id} 
                  padding="md" 
                  className={`member-info-card ${isCurrentUser ? 'is-self' : ''}`}
                  onClick={() => setSelectedMember(member)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar src={member.avatar} name={member.name} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {member.name}
                        </strong>
                        {isCurrentUser && (
                          <span style={{ fontSize: '0.6875rem', background: 'var(--accent-muted)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                            Você
                          </span>
                        )}
                        {isAdmin && (
                          <span style={{ fontSize: '0.6875rem', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                            Admin
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        @{member.username || 'atleta'}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    background: 'var(--bg-elevated)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Meta</span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {member.weeklyCheckins || 0}/{member.weeklyGoal || 4}x
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Streak</span>
                      <strong style={{ color: '#f59e0b', fontSize: '0.875rem' }}>
                        🔥 {member.streak || 0}d
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Séries</span>
                      <strong style={{ color: '#38bdf8', fontSize: '0.875rem' }}>
                        {member.currentGroupSets || 0}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>
                    <span>Ver Perfil & Treinos</span>
                    <ChevronRight size={14} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BATE-PAPO (CHAT) */}
      {activeTab === 'chat' && (
        <div className="group-tab-container chat-tab-content animate-fade-in">
          <Card className="chat-container-card" padding="none">
            <div className="chat-messages-area">
              <div className="chat-system-notice">
                <span>Conversa do grupo "{group.name}".</span>
              </div>

              {messages.map(msg => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id} className={`chat-bubble-row ${isMe ? 'chat-row-me' : 'chat-row-other'}`}>
                    {!isMe && (
                      <div 
                        onClick={() => {
                          const m = enrichedMembers.find(mb => mb.name === msg.userName);
                          if (m) setSelectedMember(m);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Avatar src={msg.userAvatar} name={msg.userName} size="sm" />
                      </div>
                    )}
                    <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`}>
                      {!isMe && <span className="bubble-author">{msg.userName}</span>}
                      <p className="bubble-text">{msg.text}</p>
                      <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            <form className="chat-input-bar" onSubmit={handleSendMessage}>
              <input 
                type="text"
                className="chat-text-input"
                placeholder="Mensagem para o grupo..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="chat-send-btn" disabled={!chatInput.trim()}>
                <Send size={18} />
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: DETALHES COMPLETOS DA FICHA DE TREINO (Idêntico ao Print 5 com destaque de evolução) */}
      {selectedPost && (
        <Modal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          title={`Ficha: ${selectedPost.title || selectedPost.routineName || 'Treino Concluído'}`}
          size="md"
        >
          <div className="post-detail-modal-body">
            {/* Big Photo Proof */}
            {selectedPost.photoUrl && (
              <div className="modal-post-photo-wrap">
                <img src={selectedPost.photoUrl} alt="Comprovante de treino" />
                <div className="photo-stamp-overlay">
                  <Check size={12} /> BATE PONTO CONFIRMADO
                </div>
              </div>
            )}

            {/* Quick Profile Link Button */}
            <button 
              type="button" 
              className="modal-view-profile-btn"
              onClick={() => {
                const author = enrichedMembers.find(m => m.name === selectedPost.userName) || {
                  name: selectedPost.userName,
                  avatar: selectedPost.userAvatar,
                  weeklyCheckins: 4,
                  streak: 3
                };
                setSelectedPost(null);
                setSelectedMember(author);
              }}
            >
              <Avatar src={selectedPost.userAvatar} name={selectedPost.userName} size="sm" />
              <div className="modal-view-profile-info">
                <strong>Ver perfil & calendário de {selectedPost.userName}</strong>
                <span>Toque para inspecionar frequência e estatísticas</span>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Metrics Chips */}
            <div className="modal-post-chips">
              <span className="modal-chip"><Clock size={13} /> {selectedPost.durationMinutes || 50} min</span>
              <span className="modal-chip"><Weight size={13} /> {selectedPost.showWeights === false ? '🔒' : `${selectedPost.totalVolumeKg?.toLocaleString('pt-BR')} kg`}</span>
              <span className="modal-chip"><Sparkles size={13} /> {selectedPost.exercises?.reduce((sum, e) => sum + (e.sets?.length || 0), 0) || 6} séries</span>
            </div>

            {/* Progression Highlight if any */}
            {selectedPost.progressNote && (
              <div className="modal-progression-box">
                <TrendingUp size={16} className="text-success" />
                <div>
                  <strong>Evolução Registrada:</strong>
                  <p>{selectedPost.progressNote}</p>
                </div>
              </div>
            )}

            {/* Personal Observation Note */}
            {selectedPost.notes && (
              <div className="modal-notes-box">
                <strong>OBSERVAÇÕES DO ATLETA:</strong>
                <p>"{selectedPost.notes}"</p>
              </div>
            )}

            {/* Ficha Completa de Exercícios no Formato Exato do Print 5 */}
            {selectedPost.exercises && selectedPost.exercises.length > 0 && (
              <div className="modal-exercises-breakdown">
                <h4>Ficha Completa de Exercícios:</h4>
                <div className="modal-exercises-cards-stack">
                  {selectedPost.exercises.map((ex, idx) => (
                    <div key={idx} className="post-exercise-detail-card">
                      <div className="post-exercise-detail-header">
                        <span className="post-exercise-number">{idx + 1}</span>
                        <div className="post-exercise-titles">
                          <span className="post-exercise-group-tag">{ex.muscleGroup || 'PEITO'}</span>
                          <h4 className="post-exercise-title-text">{ex.name}</h4>
                        </div>
                      </div>

                      <div className="post-exercise-sets-table">
                        <div className="post-sets-table-head">
                          <span>Série</span>
                          <span>Carga</span>
                          <span>Repetições</span>
                        </div>
                        {ex.sets?.map((s, sIdx) => {
                          const hasProgression = s.progression || (selectedPost.progressNote && (sIdx === 0 || sIdx === ex.sets.length - 1));

                          return (
                            <div 
                              key={sIdx} 
                              className={`post-sets-table-row ${hasProgression ? 'post-set-row-progression' : ''}`}
                            >
                              <span className="post-set-num">
                                {s.setNumber || sIdx + 1}
                                {hasProgression && <span className="prog-medal-tag" title="Evolução batida!">🏅</span>}
                              </span>
                              <span className="post-set-val">
                                {selectedPost.showWeights === false ? '🔒' : `${s.weight} kg`}
                              </span>
                              <span className="post-set-val">{s.reps} reps</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Observations box identical to Print 5 */}
                      {(ex.notes || selectedPost.notes) && (
                        <div className="post-exercise-notes-box">
                          <div className="post-notes-box-header">
                            <StickyNote size={14} className="post-notes-icon" />
                            <span>OBSERVAÇÕES & AJUSTES DE CARGA</span>
                          </div>
                          <p className="post-notes-box-content">
                            {ex.notes || selectedPost.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="modal-comments-section">
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '16px 0 8px 0' }}>
                Comentários ({selectedPost.comments?.length || 0})
              </h4>

              {selectedPost.comments && selectedPost.comments.length > 0 ? (
                <div className="modal-comments-list">
                  {selectedPost.comments.map(c => (
                    <div key={c.id} className="comment-item">
                      <Avatar src={c.userAvatar} name={c.userName} size="xs" />
                      <div className="comment-bubble">
                        <span className="comment-author">{c.userName}</span>
                        <p className="comment-text">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-tertiary" style={{ fontSize: '0.8125rem', marginBottom: '12px' }}>
                  Nenhum comentário ainda. Seja o primeiro a elogiar o treino!
                </p>
              )}

              <form className="comment-input-form" onSubmit={(e) => handleAddComment(selectedPost.id, e)}>
                <input
                  type="text"
                  className="comment-text-input"
                  placeholder="Escreva um comentário de incentivo..."
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                />
                <Button type="submit" variant="primary" size="sm" disabled={!commentInput.trim()}>
                  Enviar
                </Button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: PERFIL DO MEMBRO DO GRUPO COM CALENDÁRIO DE 4 CORES */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title={`Perfil de ${selectedMember.name}`}
          size="md"
        >
          <div className="member-profile-modal-body">
            <div className="member-profile-header">
              <Avatar src={selectedMember.avatar} name={selectedMember.name} size="xl" />
              <div>
                <h3>{selectedMember.name}</h3>
                <span className="text-muted">@{selectedMember.username || 'atleta'}</span>
                <div className="member-stats-row">
                  <span>🔥 {selectedMember.streak || 0}d streak</span>
                  <span>🏆 {selectedMember.weeklyCheckins || 0}/{selectedMember.weeklyGoal || 4} meta</span>
                  <span>⚡ {selectedMember.currentGroupSets || 0} séries</span>
                </div>
              </div>
            </div>

            {/* Mini Calendar with 4 distinct color states */}
            <div className="member-calendar-box">
              <div className="member-cal-header-row">
                <h4>Calendário de Treinos do Mês</h4>
                <span className="member-cal-current-label">Setembro 2026</span>
              </div>

              <div className="member-cal-weekdays">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>

              <div className="member-cal-grid">
                {getCalendarDaysCurrentOnly(new Date().getFullYear(), new Date().getMonth()).map((dObj, idx) => {
                  if (!dObj) {
                    return <div key={`blank-${idx}`} className="member-cal-cell member-cal-blank" />;
                  }

                  const todayNum = new Date().getDate();
                  const targetDate = new Date(dObj.year, dObj.month, dObj.day);
                  const dayOfWeek = targetDate.getDay(); // 0 is Sun, 1 is Mon...

                  // Simulate realistic member schedule (workout on weekdays + sat, sun rest)
                  const isScheduledRest = dayOfWeek === 0; // Domingo descanso
                  const isScheduledWorkout = !isScheduledRest;

                  // Realistic done days based on member streak and volume
                  const isDone = dObj.isCurrentMonth && (
                    dObj.day <= todayNum && 
                    (dObj.day % 2 === 0 || dObj.day === 1 || dObj.day === 7 || dObj.day === 15 || dObj.day === 21) &&
                    !isScheduledRest
                  );

                  const isPast = dObj.isCurrentMonth && dObj.day < todayNum;
                  const isTodayOrFuture = dObj.isCurrentMonth && dObj.day >= todayNum;

                  let cellClass = '';
                  let cellIcon = null;

                  if (isDone) {
                    // 🟢 Verde: Concluído
                    cellClass = 'member-cal-done-green';
                  } else if (isScheduledRest) {
                    // 💤 Roxo suave: Descanso
                    cellClass = 'member-cal-rest';
                    cellIcon = <span className="member-cal-rest-icon">zZ</span>;
                  } else if (isPast && isScheduledWorkout) {
                    // 🔴 Vermelho: Falta
                    cellClass = 'member-cal-missed';
                  } else if (isTodayOrFuture && isScheduledWorkout) {
                    // 🔵 Azul: Pendente
                    cellClass = 'member-cal-pending-blue';
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`member-cal-cell ${cellClass} ${dObj.isCurrentMonth && dObj.day === todayNum ? 'is-today' : ''}`}
                    >
                      <span className="cal-day-num">{dObj.day}</span>
                      {cellIcon}
                    </div>
                  );
                })}
              </div>

              {/* 4-Color Legend Aligned */}
              <div className="member-calendar-legend">
                <span className="legend-item">
                  <span className="legend-dot legend-dot-green" /> Concluído
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-red" /> Falta
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-blue" /> Pendente
                </span>
                <span className="legend-item">
                  <span className="legend-text-rest">zZ</span> Descanso
                </span>
              </div>
            </div>

            {/* Member's Routines */}
            <div className="member-routines-section" style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dumbbell size={16} className="text-accent" /> Rotinas de Treino ({selectedMember.name})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedMember.id === user?.id ? routines : [
                  { id: 'sample_1', name: 'Treino A - Peito & Tríceps', exercises: [{ name: 'Supino Reto', sets: [{ weight: 90, reps: 10 }] }, { name: 'Crucifixo Inclinado', sets: [{ weight: 22, reps: 12 }] }] },
                  { id: 'sample_2', name: 'Treino B - Costas & Bíceps', exercises: [{ name: 'Puxada Aberta', sets: [{ weight: 80, reps: 10 }] }, { name: 'Rosca Direta', sets: [{ weight: 32, reps: 10 }] }] },
                  { id: 'sample_3', name: 'Treino C - Pernas & Ombros', exercises: [{ name: 'Leg Press 45º', sets: [{ weight: 240, reps: 12 }] }, { name: 'Desenvolvimento', sets: [{ weight: 50, reps: 10 }] }] }
                ]).map((r, rIdx) => {
                  const hideWeights = selectedMember.id === user?.id
                    ? !user?.privacy?.publicRoutineWeights
                    : !selectedMember.privacy?.publicRoutineWeights;

                  return (
                    <div key={r.id || rIdx} style={{
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.name}</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {r.exercises?.map((ex, eIdx) => (
                          <span key={eIdx} style={{
                            fontSize: '0.75rem',
                            background: 'var(--bg-elevated)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)'
                          }}>
                            {ex.name} {!hideWeights && ex.sets?.[0]?.weight > 0 ? `(${ex.sets[0].weight}kg)` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Member's Body Measurements (respecting privacy) */}
            <div className="member-measurements-privacy-box" style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ruler size={16} className="text-accent" /> Medidas Corporais
              </h4>
              {(selectedMember.id === user?.id ? user?.privacy?.publicMeasurements : selectedMember.privacy?.publicMeasurements) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center', background: 'var(--bg-card)', padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                  <div><span>Braço E.</span><strong style={{ display: 'block', color: 'var(--text-primary)' }}>39 cm</strong></div>
                  <div><span>Braço D.</span><strong style={{ display: 'block', color: 'var(--text-primary)' }}>39.5 cm</strong></div>
                  <div><span>Peito</span><strong style={{ display: 'block', color: 'var(--text-primary)' }}>104 cm</strong></div>
                  <div><span>Cintura</span><strong style={{ display: 'block', color: 'var(--text-primary)' }}>82 cm</strong></div>
                </div>
              ) : (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>🔒</span>
                  <span>As medidas corporais deste atleta são privadas.</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
