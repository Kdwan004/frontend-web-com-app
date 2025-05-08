import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './index.css'; // Assuming shared styles

interface CalendarTask {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
}

const GroupCalendar: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedDateForTask, setSelectedDateForTask] = useState<string>(''); // YYYY-MM-DD

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- Calendar Logic Helpers ---
  const getMonthName = (date: Date) => {
    return date.toLocaleString('default', { month: 'long' });
  };

  const getYear = (date: Date) => {
    return date.getFullYear();
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
  };

  // --- Event Handlers ---
  const handlePrevMonth = () => {
    setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !selectedDateForTask.trim()) {
      alert('Please select a date and enter task text.'); // Simple validation
      return;
    }
    const newTask: CalendarTask = {
      id: Date.now().toString(), // Simple unique ID
      date: selectedDateForTask,
      text: newTaskText,
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
    setNewTaskText('');
    // Optionally clear selectedDateForTask or keep it for adding multiple tasks to the same day
  };

  // --- Rendering Calendar Grid ---
  const renderCalendarGrid = () => {
    const year = getYear(currentDate);
    const month = currentDate.getMonth(); // 0-indexed
    const numDays = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const blanks = Array(firstDay).fill(null);
    const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

    const cells = [...blanks, ...daysArray].map((day, index) => {
      if (day === null) {
        return <div key={`blank-${index}`} className="calendar-day-cell empty"></div>;
      }
      const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = tasks.filter(task => task.date === fullDateStr);

      return (
        <div 
          key={fullDateStr} 
          className={`calendar-day-cell ${selectedDateForTask === fullDateStr ? 'selected' : ''}`}
          onClick={() => setSelectedDateForTask(fullDateStr)} // Allow selecting a day
        >
          <span className="day-number">{day}</span>
          <div className="tasks-on-day">
            {dayTasks.map(task => (
              <div key={task.id} className="task-item">{task.text}</div>
            ))}
          </div>
        </div>
      );
    });
    return cells;
  };
  
  // Effect to pre-fill selectedDateForTask for convenience if month changes
  useEffect(() => {
    const year = getYear(currentDate);
    const month = currentDate.getMonth();
    setSelectedDateForTask(`${year}-${String(month + 1).padStart(2, '0')}-01`);
  }, [currentDate]);

  return (
    <div className="app-container calendar-page">
      <header className="calendar-header">
        <h1>Calendar for Group {groupId}</h1>
        <button onClick={() => navigate('/portal')} className="action-button">
          Back to Portal
        </button>
      </header>

      <div className="calendar-controls">
        <button onClick={handlePrevMonth} className="month-nav-button">Previous</button>
        <h2>{getMonthName(currentDate)} {getYear(currentDate)}</h2>
        <button onClick={handleNextMonth} className="month-nav-button">Next</button>
      </div>

      <div className="calendar-view">
        <div className="calendar-grid">
          {daysOfWeek.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {renderCalendarGrid()}
        </div>
      </div>

      <div className="task-management-section">
        <h3>Add New Task</h3>
        <form onSubmit={handleAddTask} className="task-form">
          <div className="form-group">
            <label htmlFor="task-date">Date Selected: {selectedDateForTask || '(Click a day above)'}</label>
            {/* For simplicity, date is selected by clicking on calendar. Can add input[type=date] if needed */}
          </div>
          <div className="form-group">
            <label htmlFor="task-text">Task:</label>
            <input 
              type="text" 
              id="task-text"
              value={newTaskText} 
              onChange={(e) => setNewTaskText(e.target.value)} 
              placeholder="Enter task description"
              required
            />
          </div>
          <button type="submit" className="action-button add-task-button">Add Task</button>
        </form>
      </div>
    </div>
  );
};

export default GroupCalendar; 