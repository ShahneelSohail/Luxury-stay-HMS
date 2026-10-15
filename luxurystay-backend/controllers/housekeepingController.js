const HousekeepingTask = require('../models/HousekeepingTask');
const Room             = require('../models/Room');
const User             = require('../models/User');
const { AppError }     = require('../middleware/errorHandler');
const catchAsync       = require('../utils/catchAsync');
const { sendSuccess }  = require('../utils/apiResponse');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { validateObjectId } = require('../utils/objectId');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const populateTask = (query) =>
  query
    .populate('room',      'roomNumber floor type typeLabel status')
    .populate('assignedTo','name email role')
    .populate('createdBy', 'name email role');

const buildPayload = (t) => ({
  id:               t._id,
  room:             t.room,
  taskType:         t.taskType,
  taskTypeLabel:    t.taskTypeLabel,
  title:            t.title         || null,
  displayTitle:     t.displayTitle,
  assignedTo:       t.assignedTo    || null,
  status:           t.status,
  priority:         t.priority,
  scheduledFor:     t.scheduledFor  || null,
  completedAt:      t.completedAt   || null,
  durationMinutes:  t.durationMinutes,
  notes:            t.notes         || null,
  reportedIssue:    t.reportedIssue || null,
  issueReportedAt:  t.issueReportedAt || null,
  createdBy:        t.createdBy,
  createdAt:        t.createdAt,
  updatedAt:        t.updatedAt,
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/housekeeping
 * Access: admin, manager, housekeeping
 */
exports.createTask = catchAsync(async (req, res, next) => {
  const { room: roomId, taskType, title, assignedTo, priority, scheduledFor, notes } = req.body;

  validateObjectId(roomId, 'Room ID');

  const room = await Room.findById(roomId);
  if (!room)            return next(new AppError('Room not found.', 404));
  if (!room.isActive)   return next(new AppError('Cannot assign a task to an inactive room.', 400));

  if (assignedTo) {
    validateObjectId(assignedTo, 'Assigned User ID');
    const staff = await User.findById(assignedTo);
    if (!staff)   return next(new AppError('Assigned staff member not found.', 404));
    if (!['admin', 'manager', 'housekeeping'].includes(staff.role)) {
      return next(new AppError('Tasks can only be assigned to admin, manager, or housekeeping staff.', 400));
    }
  }

  const task = await HousekeepingTask.create({
    room:        roomId,
    taskType:    taskType    || 'other',
    title,
    assignedTo:  assignedTo  || null,
    priority:    priority    || 'medium',
    scheduledFor:scheduledFor ? new Date(scheduledFor) : null,
    notes,
    createdBy:   req.user.id,
  });

  const populated = await populateTask(HousekeepingTask.findById(task._id));

  sendSuccess(res, 201, `Housekeeping task created for room ${room.roomNumber}.`, {
    task: buildPayload(populated),
  });
});

/**
 * GET /api/housekeeping
 * Access: admin, manager, housekeeping
 * Supports ?status=&priority=&assignedTo=&roomId=&date=&page=&limit=&sort=
 * Returns tasks grouped by status for the FE Kanban board.
 *
 * On every load: auto-creates departure_clean tasks for any cleaning room
 * that has no active (queued/in-progress) task, so the board stays in sync
 * with room status even for rooms that were set to cleaning before this logic existed.
 */
exports.getAllTasks = catchAsync(async (req, res) => {
  // Sync: find cleaning rooms missing an active task and create one
  const cleaningRooms = await Room.find({ status: 'cleaning', isActive: true }).select('_id');
  if (cleaningRooms.length) {
    const roomIds = cleaningRooms.map(r => r._id);
    const activeTasks = await HousekeepingTask.find({
      room:     { $in: roomIds },
      taskType: 'departure_clean',
      status:   { $in: ['queued', 'in-progress'] },
    }).select('room');
    const coveredRoomIds = new Set(activeTasks.map(t => String(t.room)));

    const toCreate = cleaningRooms.filter(r => !coveredRoomIds.has(String(r._id)));
    if (toCreate.length) {
      const systemUserId = req.user?.id;
      await HousekeepingTask.insertMany(
        toCreate.map(r => ({
          room:        r._id,
          taskType:    'departure_clean',
          priority:    'high',
          status:      'queued',
          scheduledFor: new Date(),
          notes:       'Auto-generated: room in cleaning status.',
          createdBy:   systemUserId,
        }))
      );
    }
  }
  const { page, limit, skip } = getPagination(req.query);
  const { status, priority, assignedTo, roomId, date, sort } = req.query;

  const filter = {};
  if (status)     filter.status     = status;
  if (priority)   filter.priority   = priority;
  if (assignedTo) { validateObjectId(assignedTo, 'Staff ID'); filter.assignedTo = assignedTo; }
  if (roomId)     { validateObjectId(roomId, 'Room ID');      filter.room       = roomId; }
  if (date) {
    const d = new Date(date);
    filter.scheduledFor = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const sortMap = {
    priority:   { priority: -1, scheduledFor: 1 },
    scheduled:  { scheduledFor: 1 },
    newest:     { createdAt: -1 },
    status:     { status: 1, priority: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.priority;

  const [tasks, totalCount] = await Promise.all([
    populateTask(HousekeepingTask.find(filter).sort(sortOrder).skip(skip).limit(limit)),
    HousekeepingTask.countDocuments(filter),
  ]);

  // Kanban column counts — always returned regardless of active filters
  const [queuedCount, inProgressCount, completedCount] = await Promise.all([
    HousekeepingTask.countDocuments({ status: 'queued' }),
    HousekeepingTask.countDocuments({ status: 'in-progress' }),
    HousekeepingTask.countDocuments({ status: 'completed' }),
  ]);

  sendSuccess(
    res,
    200,
    'Housekeeping tasks retrieved.',
    {
      tasks: tasks.map(buildPayload),
      kanban: { queued: queuedCount, inProgress: inProgressCount, completed: completedCount },
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/housekeeping/room/:roomId
 * Access: admin, manager, housekeeping, receptionist
 */
exports.getTasksByRoom = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.roomId, 'Room ID');

  const room = await Room.findById(req.params.roomId);
  if (!room) return next(new AppError('Room not found.', 404));

  const { page, limit, skip } = getPagination(req.query);

  const [tasks, totalCount] = await Promise.all([
    populateTask(
      HousekeepingTask.find({ room: req.params.roomId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ),
    HousekeepingTask.countDocuments({ room: req.params.roomId }),
  ]);

  sendSuccess(
    res,
    200,
    `Tasks for room ${room.roomNumber}.`,
    { room: { id: room._id, roomNumber: room.roomNumber, status: room.status }, tasks: tasks.map(buildPayload) },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/housekeeping/staff/:staffId
 * Access: admin, manager, housekeeping
 */
exports.getTasksByStaff = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.staffId, 'Staff ID');

  const staff = await User.findById(req.params.staffId);
  if (!staff) return next(new AppError('Staff member not found.', 404));

  const { page, limit, skip } = getPagination(req.query);
  const { status } = req.query;

  const filter = { assignedTo: req.params.staffId };
  if (status) filter.status = status;

  const [tasks, totalCount] = await Promise.all([
    populateTask(
      HousekeepingTask.find(filter)
        .sort({ status: 1, priority: -1, scheduledFor: 1 })
        .skip(skip)
        .limit(limit)
    ),
    HousekeepingTask.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    `Tasks assigned to ${staff.name}.`,
    {
      staff: { id: staff._id, name: staff.name, role: staff.role },
      tasks: tasks.map(buildPayload),
    },
    getPaginationMeta(totalCount, page, limit)
  );
});

/**
 * GET /api/housekeeping/:id
 * Access: admin, manager, housekeeping
 */
exports.getTaskById = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Task ID');

  const task = await populateTask(HousekeepingTask.findById(req.params.id));
  if (!task) return next(new AppError('Task not found.', 404));

  sendSuccess(res, 200, 'Task retrieved.', { task: buildPayload(task) });
});

/**
 * PATCH /api/housekeeping/:id
 * General update — title, priority, scheduledFor, notes.
 * Status and assignment have dedicated endpoints.
 * Access: admin, manager, housekeeping
 */
exports.updateTask = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Task ID');

  const task = await HousekeepingTask.findById(req.params.id);
  if (!task) return next(new AppError('Task not found.', 404));

  if (task.status === 'completed') {
    return next(new AppError('Cannot update a completed task.', 400));
  }

  const allowedFields = ['taskType', 'title', 'assignedTo', 'priority', 'scheduledFor', 'notes', 'status'];
  const updateFields  = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updateFields[f] = req.body[f];
  });

  if (updateFields.scheduledFor) updateFields.scheduledFor = new Date(updateFields.scheduledFor);
  if (updateFields.status && !['queued', 'in-progress'].includes(updateFields.status)) {
    return next(new AppError('Use the /complete endpoint to mark a task as completed.', 400));
  }
  if (Object.keys(updateFields).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const updated = await populateTask(
    HousekeepingTask.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true })
  );

  sendSuccess(res, 200, 'Task updated.', { task: buildPayload(updated) });
});

/**
 * PATCH /api/housekeeping/:id/assign
 * Assigns or reassigns a task to a housekeeping staff member.
 * Access: admin, manager
 */
exports.assignTask = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Task ID');

  const { assignedTo } = req.body;
  if (!assignedTo) return next(new AppError('assignedTo (User ID) is required.', 400));

  validateObjectId(assignedTo, 'Assigned User ID');

  const [task, staff] = await Promise.all([
    HousekeepingTask.findById(req.params.id),
    User.findById(assignedTo),
  ]);

  if (!task)  return next(new AppError('Task not found.', 404));
  if (!staff) return next(new AppError('Staff member not found.', 404));

  if (!['admin', 'manager', 'housekeeping'].includes(staff.role)) {
    return next(new AppError('Tasks can only be assigned to admin, manager, or housekeeping staff.', 400));
  }
  if (task.status === 'completed') {
    return next(new AppError('Cannot reassign a completed task.', 400));
  }

  task.assignedTo = assignedTo;
  if (task.status === 'queued') task.status = 'in-progress';
  await task.save();

  const populated = await populateTask(HousekeepingTask.findById(task._id));

  sendSuccess(res, 200, `Task assigned to ${staff.name}.`, { task: buildPayload(populated) });
});

/**
 * PATCH /api/housekeeping/:id/complete
 * Marks a task as completed and optionally updates the room status.
 * Access: admin, manager, housekeeping
 */
exports.markComplete = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Task ID');

  const task = await HousekeepingTask.findById(req.params.id);
  if (!task) return next(new AppError('Task not found.', 404));

  if (task.status === 'completed') {
    return next(new AppError('Task is already completed.', 400));
  }

  const { notes, updateRoomStatus } = req.body;

  task.status      = 'completed';
  task.completedAt = new Date();
  if (notes !== undefined) task.notes = notes;
  await task.save();

  // Optionally transition room to available after clean
  let roomUpdate = null;
  if (updateRoomStatus === true) {
    const room = await Room.findByIdAndUpdate(
      task.room,
      { status: 'available', lastStatusChange: new Date(), statusNote: null },
      { new: true }
    );
    roomUpdate = room ? { id: room._id, roomNumber: room.roomNumber, status: room.status } : null;
  }

  const populated = await populateTask(HousekeepingTask.findById(task._id));

  sendSuccess(res, 200, `Task marked as completed${roomUpdate ? ` — room ${roomUpdate.roomNumber} is now available` : ''}.`, {
    task:       buildPayload(populated),
    roomUpdate,
  });
});

/**
 * PATCH /api/housekeeping/:id/issue
 * Reports an issue found during a housekeeping task (e.g. broken fixture, damage).
 * Stores the issue description on the task for supervisor review.
 * Access: admin, manager, housekeeping
 */
exports.reportIssue = catchAsync(async (req, res, next) => {
  validateObjectId(req.params.id, 'Task ID');

  const { reportedIssue } = req.body;
  if (!reportedIssue || !reportedIssue.trim()) {
    return next(new AppError('Issue description is required.', 400));
  }

  const task = await HousekeepingTask.findById(req.params.id);
  if (!task) return next(new AppError('Task not found.', 404));

  task.reportedIssue   = reportedIssue.trim();
  task.issueReportedAt = new Date();
  await task.save();

  const populated = await populateTask(HousekeepingTask.findById(task._id));

  sendSuccess(res, 200, `Issue reported for room ${populated.room?.roomNumber}.`, {
    task: buildPayload(populated),
  });
});
