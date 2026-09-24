import React, { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell, Check, X, ChevronRight, Activity } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './ExerciseSelectorModal.css';

export const EXERCISE_DATABASE = [
  // 1. PEITORAL
  { id: 'p_1', name: 'Supino reto com barra', muscleGroup: 'Peitoral' },
  { id: 'p_2', name: 'Supino reto com halteres', muscleGroup: 'Peitoral' },
  { id: 'p_3', name: 'Supino reto na máquina articulada', muscleGroup: 'Peitoral' },
  { id: 'p_4', name: 'Supino reto na máquina Smith', muscleGroup: 'Peitoral' },
  { id: 'p_5', name: 'Supino reto na fita de suspensão (TRX)', muscleGroup: 'Peitoral' },
  { id: 'p_6', name: 'Supino inclinado com barra', muscleGroup: 'Peitoral' },
  { id: 'p_7', name: 'Supino inclinado com halteres', muscleGroup: 'Peitoral' },
  { id: 'p_8', name: 'Supino inclinado na máquina Smith', muscleGroup: 'Peitoral' },
  { id: 'p_9', name: 'Supino inclinado na máquina articulada', muscleGroup: 'Peitoral' },
  { id: 'p_10', name: 'Supino declinado com barra', muscleGroup: 'Peitoral' },
  { id: 'p_11', name: 'Supino declinado com halteres', muscleGroup: 'Peitoral' },
  { id: 'p_12', name: 'Supino declinado na máquina Smith', muscleGroup: 'Peitoral' },
  { id: 'p_13', name: 'Crucifixo reto com halteres', muscleGroup: 'Peitoral' },
  { id: 'p_14', name: 'Crucifixo inclinado com halteres', muscleGroup: 'Peitoral' },
  { id: 'p_15', name: 'Crucifixo declinado com halteres', muscleGroup: 'Peitoral' },
  { id: 'p_16', name: 'Crossover com polia alta', muscleGroup: 'Peitoral' },
  { id: 'p_17', name: 'Crossover com polia média', muscleGroup: 'Peitoral' },
  { id: 'p_18', name: 'Crossover com polia baixa', muscleGroup: 'Peitoral' },
  { id: 'p_19', name: 'Peck deck', muscleGroup: 'Peitoral' },
  { id: 'p_20', name: 'Crucifixo máquina', muscleGroup: 'Peitoral' },
  { id: 'p_21', name: 'Flexão de braços tradicional', muscleGroup: 'Peitoral' },
  { id: 'p_22', name: 'Flexão de braços inclinada (mãos elevadas)', muscleGroup: 'Peitoral' },
  { id: 'p_23', name: 'Flexão de braços declinada (pés elevados)', muscleGroup: 'Peitoral' },
  { id: 'p_24', name: 'Flexão de braços diamante', muscleGroup: 'Peitoral' },
  { id: 'p_25', name: 'Flexão de braços aberta', muscleGroup: 'Peitoral' },
  { id: 'p_26', name: 'Paralelas para peito (corpo inclinado à frente)', muscleGroup: 'Peitoral' },

  // 2. COSTAS
  { id: 'c_1', name: 'Puxada alta com pegada aberta pronada', muscleGroup: 'Costas' },
  { id: 'c_2', name: 'Puxada alta com pegada supinada', muscleGroup: 'Costas' },
  { id: 'c_3', name: 'Puxada alta com pegada neutra (triângulo)', muscleGroup: 'Costas' },
  { id: 'c_4', name: 'Puxada alta unilateral na polia', muscleGroup: 'Costas' },
  { id: 'c_5', name: 'Barra fixa com pegada pronada (Pull-up)', muscleGroup: 'Costas' },
  { id: 'c_6', name: 'Barra fixa com pegada supinada (Chin-up)', muscleGroup: 'Costas' },
  { id: 'c_7', name: 'Barra fixa com pegada neutra', muscleGroup: 'Costas' },
  { id: 'c_8', name: 'Remada curvada com barra pronada', muscleGroup: 'Costas' },
  { id: 'c_9', name: 'Remada curvada com barra supinada', muscleGroup: 'Costas' },
  { id: 'c_10', name: 'Remada curvada com halteres', muscleGroup: 'Costas' },
  { id: 'c_11', name: 'Remada unilateral com halter ("Serrote")', muscleGroup: 'Costas' },
  { id: 'c_12', name: 'Remada unilateral na polia', muscleGroup: 'Costas' },
  { id: 'c_13', name: 'Remada baixa na polia com triângulo', muscleGroup: 'Costas' },
  { id: 'c_14', name: 'Remada baixa na polia com barra reta', muscleGroup: 'Costas' },
  { id: 'c_15', name: 'Remada baixa na polia com corda', muscleGroup: 'Costas' },
  { id: 'c_16', name: 'Remada cavalo (barra T) livre', muscleGroup: 'Costas' },
  { id: 'c_17', name: 'Remada cavalo articulada (com apoio no peito)', muscleGroup: 'Costas' },
  { id: 'c_18', name: 'Remada articulada na máquina', muscleGroup: 'Costas' },
  { id: 'c_19', name: 'Pullover com halter no banco', muscleGroup: 'Costas' },
  { id: 'c_20', name: 'Pullover na polia alta com barra reta', muscleGroup: 'Costas' },
  { id: 'c_21', name: 'Puxada com braços estendidos na polia alta com corda', muscleGroup: 'Costas' },
  { id: 'c_22', name: 'Puxada com braços estendidos na polia alta com barra', muscleGroup: 'Costas' },

  // 3. OMBROS
  { id: 'o_1', name: 'Desenvolvimento com halteres sentado', muscleGroup: 'Ombros' },
  { id: 'o_2', name: 'Desenvolvimento com halteres em pé', muscleGroup: 'Ombros' },
  { id: 'o_3', name: 'Desenvolvimento Arnold com halteres', muscleGroup: 'Ombros' },
  { id: 'o_4', name: 'Desenvolvimento com barra pela frente', muscleGroup: 'Ombros' },
  { id: 'o_5', name: 'Desenvolvimento na máquina Smith', muscleGroup: 'Ombros' },
  { id: 'o_6', name: 'Desenvolvimento na máquina articulada', muscleGroup: 'Ombros' },
  { id: 'o_7', name: 'Elevação lateral com halteres em pé', muscleGroup: 'Ombros' },
  { id: 'o_8', name: 'Elevação lateral com halteres sentado', muscleGroup: 'Ombros' },
  { id: 'o_9', name: 'Elevação lateral na polia unilateral (por trás)', muscleGroup: 'Ombros' },
  { id: 'o_10', name: 'Elevação lateral na polia unilateral (pela frente)', muscleGroup: 'Ombros' },
  { id: 'o_11', name: 'Elevação lateral na máquina', muscleGroup: 'Ombros' },
  { id: 'o_12', name: 'Elevação frontal com halteres alternada', muscleGroup: 'Ombros' },
  { id: 'o_13', name: 'Elevação frontal com halteres simultânea', muscleGroup: 'Ombros' },
  { id: 'o_14', name: 'Elevação frontal com barra reta', muscleGroup: 'Ombros' },
  { id: 'o_15', name: 'Elevação frontal com barra W', muscleGroup: 'Ombros' },
  { id: 'o_16', name: 'Elevação frontal com anilha', muscleGroup: 'Ombros' },
  { id: 'o_17', name: 'Elevação frontal na polia com corda', muscleGroup: 'Ombros' },
  { id: 'o_18', name: 'Elevação frontal na polia com barra', muscleGroup: 'Ombros' },
  { id: 'o_19', name: 'Elevação posterior com halteres (tronco curvado)', muscleGroup: 'Ombros' },
  { id: 'o_20', name: 'Elevação posterior no voador invertido', muscleGroup: 'Ombros' },
  { id: 'o_21', name: 'Elevação posterior na polia alta cruzada', muscleGroup: 'Ombros' },
  { id: 'o_22', name: 'Face pull na polia alta com corda', muscleGroup: 'Ombros' },

  // 4. TRAPÉZIO
  { id: 't_1', name: 'Encolhimento de ombros com barra pela frente', muscleGroup: 'Trapézio' },
  { id: 't_2', name: 'Encolhimento de ombros com barra por trás', muscleGroup: 'Trapézio' },
  { id: 't_3', name: 'Encolhimento de ombros com halteres', muscleGroup: 'Trapézio' },
  { id: 't_4', name: 'Encolhimento de ombros na máquina Smith', muscleGroup: 'Trapézio' },

  // 5. QUADRÍCEPS
  { id: 'q_1', name: 'Agachamento livre com barra', muscleGroup: 'Quadríceps' },
  { id: 'q_2', name: 'Agachamento livre com halteres', muscleGroup: 'Quadríceps' },
  { id: 'q_3', name: 'Agachamento frontal com barra', muscleGroup: 'Quadríceps' },
  { id: 'q_4', name: 'Agachamento sumô com halter', muscleGroup: 'Quadríceps' },
  { id: 'q_5', name: 'Agachamento sumô com barra', muscleGroup: 'Quadríceps' },
  { id: 'q_6', name: 'Agachamento hack na máquina', muscleGroup: 'Quadríceps' },
  { id: 'q_7', name: 'Agachamento no Smith', muscleGroup: 'Quadríceps' },
  { id: 'q_8', name: 'Leg press 45°', muscleGroup: 'Quadríceps' },
  { id: 'q_9', name: 'Leg press 180° (horizontal)', muscleGroup: 'Quadríceps' },
  { id: 'q_10', name: 'Leg press vertical', muscleGroup: 'Quadríceps' },
  { id: 'q_11', name: 'Cadeira extensora bilateral', muscleGroup: 'Quadríceps' },
  { id: 'q_12', name: 'Cadeira extensora unilateral', muscleGroup: 'Quadríceps' },
  { id: 'q_13', name: 'Passada / Afundo caminhando com halteres', muscleGroup: 'Quadríceps' },
  { id: 'q_14', name: 'Passada / Afundo estático com barra', muscleGroup: 'Quadríceps' },
  { id: 'q_15', name: 'Agachamento búlgaro com halteres', muscleGroup: 'Quadríceps' },
  { id: 'q_16', name: 'Agachamento búlgaro com barra', muscleGroup: 'Quadríceps' },
  { id: 'q_17', name: 'Sissy squat (agachamento Sissy)', muscleGroup: 'Quadríceps' },

  // 6. POSTERIOR DE COXA E GLÚTEOS
  { id: 'pg_1', name: 'Mesa flexora deitado', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_2', name: 'Cadeira flexora sentado', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_3', name: 'Flexão de pernas em pé unilateral na máquina', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_4', name: 'Stiff com barra', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_5', name: 'Stiff com halteres', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_6', name: 'Levantamento terra romeno (RDL) com barra', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_7', name: 'Levantamento terra romeno (RDL) com halteres', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_8', name: 'Elevação pélvica (Hip Thrust) com barra', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_9', name: 'Elevação pélvica na máquina', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_10', name: 'Elevação pélvica no Smith', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_11', name: 'Cadeira adutora', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_12', name: 'Cadeira abdutora', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_13', name: 'Abdução de quadril no cabo com caneleira', muscleGroup: 'Posterior de Coxa e Glúteos' },
  { id: 'pg_14', name: 'Adução de quadril no cabo com caneleira', muscleGroup: 'Posterior de Coxa e Glúteos' },

  // 7. PANTURRILHA
  { id: 'pa_1', name: 'Gêmeos sentado (cadeira de panturrilha)', muscleGroup: 'Panturrilha' },
  { id: 'pa_2', name: 'Gêmeos em pé no Smith', muscleGroup: 'Panturrilha' },
  { id: 'pa_3', name: 'Gêmeos em pé na máquina', muscleGroup: 'Panturrilha' },
  { id: 'pa_4', name: 'Gêmeos no Leg Press', muscleGroup: 'Panturrilha' },
  { id: 'pa_5', name: 'Panturrilha unilateral em degrau', muscleGroup: 'Panturrilha' },

  // 8. BÍCEPS
  { id: 'b_1', name: 'Rosca direta com barra reta', muscleGroup: 'Bíceps' },
  { id: 'b_2', name: 'Rosca direta com barra W', muscleGroup: 'Bíceps' },
  { id: 'b_3', name: 'Rosca direta com halteres', muscleGroup: 'Bíceps' },
  { id: 'b_4', name: 'Rosca alternada com halteres', muscleGroup: 'Bíceps' },
  { id: 'b_5', name: 'Rosca simultânea com halteres no banco inclinado', muscleGroup: 'Bíceps' },
  { id: 'b_6', name: 'Rosca Scott com barra W', muscleGroup: 'Bíceps' },
  { id: 'b_7', name: 'Rosca Scott com halter unilateral', muscleGroup: 'Bíceps' },
  { id: 'b_8', name: 'Rosca Scott na máquina', muscleGroup: 'Bíceps' },
  { id: 'b_9', name: 'Rosca martelo com halteres', muscleGroup: 'Bíceps' },
  { id: 'b_10', name: 'Rosca martelo na polia com corda', muscleGroup: 'Bíceps' },
  { id: 'b_11', name: 'Rosca concentrada unilateral com halter', muscleGroup: 'Bíceps' },
  { id: 'b_12', name: 'Rosca na polia alta (duplo bíceps no cabo)', muscleGroup: 'Bíceps' },
  { id: 'b_13', name: 'Rosca Spider (aranha) com barra', muscleGroup: 'Bíceps' },
  { id: 'b_14', name: 'Rosca Spider (aranha) com halteres', muscleGroup: 'Bíceps' },

  // 9. TRÍCEPS
  { id: 'tr_1', name: 'Tríceps na polia com corda', muscleGroup: 'Tríceps' },
  { id: 'tr_2', name: 'Tríceps na polia com barra reta', muscleGroup: 'Tríceps' },
  { id: 'tr_3', name: 'Tríceps na polia com barra V', muscleGroup: 'Tríceps' },
  { id: 'tr_4', name: 'Tríceps na polia unilateral com pegada invertida', muscleGroup: 'Tríceps' },
  { id: 'tr_5', name: 'Tríceps na polia unilateral com pegada neutra', muscleGroup: 'Tríceps' },
  { id: 'tr_6', name: 'Tríceps testa com barra W', muscleGroup: 'Tríceps' },
  { id: 'tr_7', name: 'Tríceps testa com barra reta', muscleGroup: 'Tríceps' },
  { id: 'tr_8', name: 'Tríceps testa com halteres', muscleGroup: 'Tríceps' },
  { id: 'tr_9', name: 'Tríceps testa na polia baixa', muscleGroup: 'Tríceps' },
  { id: 'tr_10', name: 'Tríceps francês com halter (duas mãos)', muscleGroup: 'Tríceps' },
  { id: 'tr_11', name: 'Tríceps francês unilateral com halter', muscleGroup: 'Tríceps' },
  { id: 'tr_12', name: 'Tríceps francês na polia baixa com corda', muscleGroup: 'Tríceps' },
  { id: 'tr_13', name: 'Tríceps coice com halter', muscleGroup: 'Tríceps' },
  { id: 'tr_14', name: 'Tríceps coice na polia', muscleGroup: 'Tríceps' },
  { id: 'tr_15', name: 'Mergulho em banco', muscleGroup: 'Tríceps' },
  { id: 'tr_16', name: 'Mergulho em paralelas para tríceps (corpo ereto)', muscleGroup: 'Tríceps' },
  { id: 'tr_17', name: 'Supino fechado com barra reta', muscleGroup: 'Tríceps' },

  // 10. ANTEBRAÇO
  { id: 'ant_1', name: 'Rosca inversa com barra reta', muscleGroup: 'Antebraço' },
  { id: 'ant_2', name: 'Rosca inversa com barra W', muscleGroup: 'Antebraço' },
  { id: 'ant_3', name: 'Flexão de punho com barra', muscleGroup: 'Antebraço' },
  { id: 'ant_4', name: 'Flexão de punho com halteres', muscleGroup: 'Antebraço' },
  { id: 'ant_5', name: 'Extensão de punho com barra', muscleGroup: 'Antebraço' },
  { id: 'ant_6', name: 'Extensão de punho com halteres', muscleGroup: 'Antebraço' },

  // 11. ABDÔMEN E CORE
  { id: 'abd_1', name: 'Abdominal infra (elevação de pernas deitado)', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_2', name: 'Abdominal infra na barra fixa (suspenso)', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_3', name: 'Abdominal infra no banco declinado', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_4', name: 'Abdominal supra no solo', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_5', name: 'Abdominal supra na bola suíça', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_6', name: 'Abdominal supra na máquina', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_7', name: 'Abdominal supra na polia alta com corda', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_8', name: 'Abdominal oblíquo rotacional no solo', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_9', name: 'Abdominal oblíquo Russian Twist com anilha', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_10', name: 'Abdominal oblíquo na polia (lenhador)', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_11', name: 'Prancha isométrica tradicional', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_12', name: 'Prancha lateral', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_13', name: 'Prancha dinâmica (subindo e descendo)', muscleGroup: 'Abdômen e Core' },
  { id: 'abd_14', name: 'Abdominal na roda (Ab Wheel)', muscleGroup: 'Abdômen e Core' },

  // 12. CARDIO
  { id: 'card_1', name: 'Esteira (Caminhada / Corrida)', muscleGroup: 'Cardio' },
  { id: 'card_2', name: 'Bicicleta Ergométrica', muscleGroup: 'Cardio' },
  { id: 'card_3', name: 'Elíptico / Transport', muscleGroup: 'Cardio' },
  { id: 'card_4', name: 'Remo Seco', muscleGroup: 'Cardio' },
  { id: 'card_5', name: 'Simulador de Escada', muscleGroup: 'Cardio' },
  { id: 'card_6', name: 'Corda de Pular', muscleGroup: 'Cardio' },
  { id: 'card_7', name: 'Natação', muscleGroup: 'Cardio' },
  { id: 'card_8', name: 'Corrida / Caminhada ao Ar Livre', muscleGroup: 'Cardio' }
];

export const CATEGORIES = [
  'Todos',
  'Peitoral',
  'Costas',
  'Ombros',
  'Trapézio',
  'Quadríceps',
  'Posterior de Coxa e Glúteos',
  'Panturrilha',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Abdômen e Core',
  'Cardio'
];

export default function ExerciseSelectorModal({ 
  isOpen, 
  onClose, 
  onSelectExercise,
  initialCategory = 'Todos'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Custom exercise creator state
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Peitoral');

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return EXERCISE_DATABASE.filter(ex => {
      const matchesCategory = selectedCategory === 'Todos' || ex.muscleGroup === selectedCategory;
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const handleSelect = (ex) => {
    onSelectExercise({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      isCardio: ex.muscleGroup === 'Cardio',
      sets: ex.muscleGroup === 'Cardio' 
        ? [{ setNumber: 1, durationMinutes: 30, completed: false }] 
        : [
            { setNumber: 1, weight: 0, reps: 0, completed: false },
            { setNumber: 2, weight: 0, reps: 0, completed: false },
            { setNumber: 3, weight: 0, reps: 0, completed: false }
          ]
    });
    onClose();
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    onSelectExercise({
      id: 'custom_' + Date.now(),
      name: customName.trim(),
      muscleGroup: customGroup,
      isCardio: customGroup === 'Cardio',
      sets: customGroup === 'Cardio'
        ? [{ setNumber: 1, durationMinutes: 30, completed: false }]
        : [
            { setNumber: 1, weight: 0, reps: 0, completed: false },
            { setNumber: 2, weight: 0, reps: 0, completed: false },
            { setNumber: 3, weight: 0, reps: 0, completed: false }
          ]
    });

    setCustomName('');
    setIsCustomOpen(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selecionar Exercício ou Cardio"
      size="md"
    >
      <div className="exercise-selector-container">
        {/* Instant Search Bar */}
        <div className="search-bar-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Pesquisar exercício ou cardio (ex: Supino, Leg press, Natação...)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* 12 Categories Horizontal Pills */}
        <div className="category-pills-row">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'Cardio' ? '🏃 Cardio' : cat}
            </button>
          ))}
        </div>

        {/* Custom exercise trigger button */}
        {!isCustomOpen ? (
          <button 
            type="button" 
            className="custom-ex-trigger-btn"
            onClick={() => {
              if (searchTerm) setCustomName(searchTerm);
              setIsCustomOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Outro / Criar Personalizado {searchTerm ? `("${searchTerm}")` : ''}</span>
          </button>
        ) : (
          <form className="custom-ex-form animate-fade-in" onSubmit={handleAddCustom}>
            <div className="custom-form-row">
              <input
                type="text"
                className="custom-name-input"
                placeholder="Nome do exercício ou modalidade personalizada"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                required
                autoFocus
              />
              <select
                className="custom-group-select"
                value={customGroup}
                onChange={e => setCustomGroup(e.target.value)}
              >
                {CATEGORIES.filter(c => c !== 'Todos').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="custom-form-actions">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCustomOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={Check}>
                Salvar e Adicionar
              </Button>
            </div>
          </form>
        )}

        {/* Exercises List */}
        <div className="exercise-list-scroll">
          {filteredExercises.length === 0 ? (
            <div className="no-exercises-found">
              <Dumbbell size={32} />
              <p>Nenhum exercício encontrado com "{searchTerm}".</p>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setCustomName(searchTerm);
                  setIsCustomOpen(true);
                }}
              >
                Criar "{searchTerm}" como Personalizado
              </Button>
            </div>
          ) : (
            filteredExercises.map(ex => (
              <div 
                key={ex.id}
                className={`exercise-item-card ${ex.muscleGroup === 'Cardio' ? 'item-is-cardio' : ''}`}
                onClick={() => handleSelect(ex)}
              >
                <div className="ex-item-info">
                  <span className="ex-item-group-badge">
                    {ex.muscleGroup === 'Cardio' ? '🏃 CARDIO' : ex.muscleGroup}
                  </span>
                  <strong className="ex-item-name">{ex.name}</strong>
                </div>
                <ChevronRight size={18} className="ex-item-arrow" />
              </div>
            ))
          )}

          {/* Always accessible custom option at bottom */}
          {!isCustomOpen && (
            <div 
              className="exercise-item-card custom-footer-card"
              onClick={() => {
                if (searchTerm) setCustomName(searchTerm);
                setIsCustomOpen(true);
              }}
            >
              <div className="ex-item-info">
                <span className="ex-item-group-badge" style={{ color: 'var(--accent)' }}>✨ PERSONALIZADO</span>
                <strong className="ex-item-name">+ Outro / Criar Exercício Personalizado</strong>
              </div>
              <Plus size={18} className="text-accent" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
