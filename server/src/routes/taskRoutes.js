import express from 'express';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getAllMyTasks
} from '../controllers/taskController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/my', getAllMyTasks);
router.get('/:conversationId', getTasks);
router.post('/', createTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

export default router;
