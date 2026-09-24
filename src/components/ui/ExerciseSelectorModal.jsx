import { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell, Check, Sparkles, X, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import './ExerciseSelectorModal.css';

export const EXERCISE_DATABASE = [
  // QUADRÍCEPS
  { id: 'ex_quad_1', name: 'Agachamento Livre com Barra', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_2', name: 'Leg Press 45°', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_3', name: 'Hack Squat', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_4', name: 'Agachamento no Smith', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_5', name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_6', name: 'Agachamento Búlgaro', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_7', name: 'Passada / Afundo com Halteres', muscleGroup: 'Quadríceps', category: 'Pernas' },
  { id: 'ex_quad_8', name: 'Sissy Squat', muscleGroup: 'Quadríceps', category: 'Pernas' },

  // POSTERIOR DE COXA / GLÚTEOS
  { id: 'ex_post_1', name: 'Stiff com Barra / Halteres', muscleGroup: 'Posterior de Coxa', category: 'Pernas' },
  { id: 'ex_post_2', name: 'Levantamento Terra Romeno (RDL)', muscleGroup: 'Posterior de Coxa', category: 'Pernas' },
  { id: 'ex_post_3', name: 'Mesa Flexora', muscleGroup: 'Posterior de Coxa', category: 'Pernas' },
  { id: 'ex_post_4', name: 'Cadeira Flexora', muscleGroup: 'Posterior de Coxa', category: 'Pernas' },
  { id: 'ex_post_5', name: 'Flexão em Pé Unilateral', muscleGroup: 'Posterior de Coxa', category: 'Pernas' },
  { id: 'ex_glut_1', name: 'Elevação Pélvica com Barra / Máquina', muscleGroup: 'Glúteos', category: 'Pernas' },
  { id: 'ex_glut_2', name: 'Cadeira Abdutora', muscleGroup: 'Glúteos', category: 'Pernas' },
  { id: 'ex_glut_3', name: 'Glúteo na Polia / Caneleira', muscleGroup: 'Glúteos', category: 'Pernas' },

  // PEITO
  { id: 'ex_peito_1', name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_2', name: 'Supino Reto com Halteres', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_3', name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_4', name: 'Supino Inclinado com Barra', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_5', name: 'Supino Declinado (Barra/Halteres)', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_6', name: 'Crossover na Polia (Cabo)', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_7', name: 'Crucifixo Reto com Halteres', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_8', name: 'Crucifixo Inclinado com Halteres', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_9', name: 'Peck Deck / Voador', muscleGroup: 'Peito', category: 'Empurrar' },
  { id: 'ex_peito_10', name: 'Flexão de Braço (Push-up)', muscleGroup: 'Peito', category: 'Empurrar' },

  // COSTAS
  { id: 'ex_costas_1', name: 'Puxada Alta (Frente / Triângulo)', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_2', name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_3', name: 'Remada Baixa no Cabo (Triângulo)', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_4', name: 'Remada Unilateral com Halter (Serrote)', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_5', name: 'Pulldown no Cabo (Corda/Barra)', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_6', name: 'Barra Fixa (Pull-up / Chin-up)', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_7', name: 'Remada Articulada (Máquina)', muscleGroup: 'Costas', category: 'Puxar' },
  { id: 'ex_costas_8', name: 'Levantamento Terra (Deadlift)', muscleGroup: 'Costas', category: 'Puxar' },

  // OMBROS
  { id: 'ex_ombro_1', name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_2', name: 'Desenvolvimento Militar com Barra', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_3', name: 'Elevação Lateral com Halteres', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_4', name: 'Elevação Lateral na Polia (Cabo)', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_5', name: 'Elevação Frontal (Halteres / Polia)', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_6', name: 'Crucifixo Invertido no Peck Deck', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_7', name: 'Crucifixo Invertido na Polia', muscleGroup: 'Ombros', category: 'Empurrar' },
  { id: 'ex_ombro_8', name: 'Encolhimento de Ombros (Trapézio)', muscleGroup: 'Ombros', category: 'Puxar' },

  // BÍCEPS
  { id: 'ex_bic_1', name: 'Rosca Direta com Barra W', muscleGroup: 'Bíceps', category: 'Braços' },
  { id: 'ex_bic_2', name: 'Rosca Direta com Halteres', muscleGroup: 'Bíceps', category: 'Braços' },
  { id: 'ex_bic_3', name: 'Rosca Alternada com Halteres', muscleGroup: 'Bíceps', category: 'Braços' },
  { id: 'ex_bic_4', name: 'Rosca Martelo com Halteres / Corda', muscleGroup: 'Bíceps', category: 'Braços' },
  { id: 'ex_bic_5', name: 'Rosca Scott (Banco / Máquina)', muscleGroup: 'Bíceps', category: 'Braços' },
  { id: 'ex_bic_6', name: 'Rosca Concentrada', muscleGroup: 'Bíceps', category: 'Braços' },
  { id: 'ex_bic_7', name: 'Rosca no Banco Inclinado 45°', muscleGroup: 'Bíceps', category: 'Braços' },

  // TRÍCEPS
  { id: 'ex_tri_1', name: 'Tríceps Pulley com Corda', muscleGroup: 'Tríceps', category: 'Braços' },
  { id: 'ex_tri_2', name: 'Tríceps Pulley com Barra Reta/V', muscleGroup: 'Tríceps', category: 'Braços' },
  { id: 'ex_tri_3', name: 'Tríceps Testa com Barra W / Halteres', muscleGroup: 'Tríceps', category: 'Braços' },
  { id: 'ex_tri_4', name: 'Tríceps Francês (Halter / Cabo)', muscleGroup: 'Tríceps', category: 'Braços' },
  { id: 'ex_tri_5', name: 'Tríceps Mergulho nas Paralelas', muscleGroup: 'Tríceps', category: 'Braços' },
  { id: 'ex_tri_6', name: 'Tríceps Banco (Dips)', muscleGroup: 'Tríceps', category: 'Braços' },
  { id: 'ex_tri_7', name: 'Tríceps Coice (Kickback)', muscleGroup: 'Tríceps', category: 'Braços' },

  // ABDÔMEN & PANTURRILHA & ANTEBRAÇO
  { id: 'ex_abd_1', name: 'Abdominal Supra (Solo / Declivado)', muscleGroup: 'Abdômen', category: 'Core' },
  { id: 'ex_abd_2', name: 'Abdominal Infra / Elevação de Pernas', muscleGroup: 'Abdômen', category: 'Core' },
  { id: 'ex_abd_3', name: 'Prancha Isométrica', muscleGroup: 'Abdômen', category: 'Core' },
  { id: 'ex_abd_4', name: 'Abdominal na Polia com Corda', muscleGroup: 'Abdômen', category: 'Core' },
  { id: 'ex_pant_1', name: 'Panturrilha em Pé (Smith / Máquina)', muscleGroup: 'Panturrilha', category: 'Pernas' },
  { id: 'ex_pant_2', name: 'Panturrilha Sentado (Gêmeos)', muscleGroup: 'Panturrilha', category: 'Pernas' },
  { id: 'ex_pant_3', name: 'Panturrilha no Leg Press', muscleGroup: 'Panturrilha', category: 'Pernas' },
  { id: 'ex_ant_1', name: 'Rosca Inversa com Barra', muscleGroup: 'Antebraço', category: 'Braços' },
  { id: 'ex_ant_2', name: 'Flexão de Punho com Barra', muscleGroup: 'Antebraço', category: 'Braços' },

  // CARDIO
  { id: 'ex_cardio_1', name: 'Esteira - Corrida / Caminhada', muscleGroup: 'Cardio', category: 'Cardio' },
  { id: 'ex_cardio_2', name: 'Bicicleta Ergométrica', muscleGroup: 'Cardio', category: 'Cardio' },
  { id: 'ex_cardio_3', name: 'Escada (Stairmaster)', muscleGroup: 'Cardio', category: 'Cardio' },
  { id: 'ex_cardio_4', name: 'Elíptico / Simulador de Caminhada', muscleGroup: 'Cardio', category: 'Cardio' },
  { id: 'ex_cardio_5', name: 'Corda / Pular Corda', muscleGroup: 'Cardio', category: 'Cardio' },
  { id: 'ex_cardio_6', name: 'Remo Ergométrico', muscleGroup: 'Cardio', category: 'Cardio' },
  { id: 'ex_cardio_7', name: 'Corrida ao Ar Livre', muscleGroup: 'Cardio', category: 'Cardio' }
];

const CATEGORIES = [
  'Todos',
  'Quadríceps',
  'Posterior de Coxa',
  'Glúteos',
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Panturrilha',
  'Antebraço',
  'Cardio'
];

export default function ExerciseSelectorModal({ isOpen, onClose, onSelectExercise }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Custom exercise creator state
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('Peito');

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    return EXERCISE_DATABASE.filter(ex => {
      const matchesCategory = selectedCategory === 'Todos' || ex.muscleGroup === selectedCategory;
      const matchesSearch = !searchTerm || ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const handleSelect = (ex) => {
    onSelectExercise({
      id: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: ex.muscleGroup === 'Cardio' 
        ? [{ setNumber: 1, weight: 0, reps: 0, duration: 30 }] 
        : [
            { setNumber: 1, weight: 0, reps: 10 },
            { setNumber: 2, weight: 0, reps: 10 },
            { setNumber: 3, weight: 0, reps: 10 }
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
      sets: [
        { setNumber: 1, weight: 0, reps: 10 },
        { setNumber: 2, weight: 0, reps: 10 },
        { setNumber: 3, weight: 0, reps: 10 }
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
      title="Selecionar Exercício"
      size="md"
    >
      <div className="exercise-selector-container">
        {/* Search input */}
        <div className="search-bar-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Pesquisar exercício por nome (ex: Supino, Leg Press, Esteira...)"
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

        {/* Category Pills horizontal scroll */}
        <div className="category-pills-row">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Add custom exercise banner */}
        {!isCustomOpen ? (
          <button 
            type="button" 
            className="custom-ex-trigger-btn"
            onClick={() => setIsCustomOpen(true)}
          >
            <Plus size={16} />
            <span>Criar Exercício Personalizado</span>
          </button>
        ) : (
          <form className="custom-ex-form animate-fade-in" onSubmit={handleAddCustom}>
            <div className="custom-form-row">
              <input
                type="text"
                className="custom-name-input"
                placeholder="Nome do exercício próprio (ex: Supino 45° Máquina)"
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
                Adicionar Ficha
              </Button>
            </div>
          </form>
        )}

        {/* List of exercises */}
        <div className="exercise-list-scroll">
          {filteredExercises.length === 0 ? (
            <div className="no-exercises-found">
              <Dumbbell size={32} />
              <p>Nenhum exercício encontrado para "{searchTerm}".</p>
              <Button variant="secondary" size="sm" onClick={() => setIsCustomOpen(true)}>
                Criar "{searchTerm}" como Personalizado
              </Button>
            </div>
          ) : (
            filteredExercises.map(ex => (
              <div 
                key={ex.id}
                className="exercise-item-card"
                onClick={() => handleSelect(ex)}
              >
                <div className="ex-item-info">
                  <span className="ex-item-group-badge">{ex.muscleGroup}</span>
                  <strong className="ex-item-name">{ex.name}</strong>
                </div>
                <ChevronRight size={18} className="ex-item-arrow" />
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
