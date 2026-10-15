/**
 * Granular permission map per role.
 * Returned on login + getMe so the FE can drive routing and
 * conditional rendering without hardcoding role checks in components.
 *
 * Shape: { module: { action: boolean } }
 */
const ROLE_PERMISSIONS = {
  admin: {
    dashboard:    { view: true },
    users:        { view: true,  create: true,  edit: true,  deactivate: true },
    guests:       { view: true,  create: true,  edit: true,  delete: true,  search: true },
    rooms:        { view: true,  create: true,  edit: true,  delete: true,  updateStatus: true },
    reservations: { view: true,  create: true,  edit: true,  cancel: true,  checkIn: true, checkOut: true },
    invoices:     { view: true,  create: true,  edit: true,  updatePayment: true },
    housekeeping: { view: true,  create: true,  assign: true, complete: true, reportIssue: true },
    maintenance:  { view: true,  create: true,  assign: true, resolve: true },
    feedback:     { view: true,  create: false, respond: true },
    services:     { view: true,  create: false, assign: true },
    reports:      { view: true },
    notifications:{ view: true },
  },

  manager: {
    dashboard:    { view: true },
    users:        { view: false, create: false, edit: false,  deactivate: false },
    guests:       { view: true,  create: true,  edit: true,  delete: false, search: true },
    rooms:        { view: true,  create: true,  edit: true,  delete: false, updateStatus: true },
    reservations: { view: true,  create: true,  edit: true,  cancel: true,  checkIn: true, checkOut: true },
    invoices:     { view: true,  create: true,  edit: true,  updatePayment: true },
    housekeeping: { view: true,  create: true,  assign: true, complete: true, reportIssue: true },
    maintenance:  { view: true,  create: true,  assign: true, resolve: true },
    feedback:     { view: true,  create: false, respond: true },
    services:     { view: true,  create: false, assign: true },
    reports:      { view: true },
    notifications:{ view: true },
  },

  receptionist: {
    dashboard:    { view: true },
    users:        { view: false, create: false, edit: false,  deactivate: false },
    guests:       { view: true,  create: true,  edit: true,  delete: false, search: true },
    rooms:        { view: true,  create: false, edit: false,  delete: false, updateStatus: false },
    reservations: { view: true,  create: true,  edit: true,  cancel: false, checkIn: true, checkOut: true },
    invoices:     { view: true,  create: true,  edit: false, updatePayment: true },
    housekeeping: { view: false, create: false, assign: false, complete: false, reportIssue: false },
    maintenance:  { view: true,  create: true,  assign: false, resolve: false },
    feedback:     { view: false, create: false, respond: false },
    services:     { view: true,  create: false, assign: false },
    reports:      { view: false },
    notifications:{ view: true },
  },

  housekeeping: {
    dashboard:    { view: true },
    users:        { view: false, create: false, edit: false,  deactivate: false },
    guests:       { view: false, create: false, edit: false,  delete: false, search: false },
    rooms:        { view: true,  create: false, edit: false,  delete: false, updateStatus: true },
    reservations: { view: false, create: false, edit: false,  cancel: false, checkIn: false, checkOut: false },
    invoices:     { view: false, create: false, edit: false,  updatePayment: false },
    housekeeping: { view: true,  create: false, assign: false, complete: true, reportIssue: true },
    maintenance:  { view: false, create: true,  assign: false, resolve: false },
    feedback:     { view: false, create: false, respond: false },
    services:     { view: true,  create: false, assign: false },
    reports:      { view: false },
    notifications:{ view: true },
  },

  service: {
    dashboard:    { view: true },
    users:        { view: false, create: false, edit: false,  deactivate: false },
    guests:       { view: false, create: false, edit: false,  delete: false, search: false },
    rooms:        { view: true,  create: false, edit: false,  delete: false, updateStatus: true },
    reservations: { view: false, create: false, edit: false,  cancel: false, checkIn: false, checkOut: false },
    invoices:     { view: false, create: false, edit: false,  updatePayment: false },
    housekeeping: { view: false, create: false, assign: false, complete: false, reportIssue: false },
    maintenance:  { view: true,  create: true,  assign: false, resolve: true },
    feedback:     { view: false, create: false, respond: false },
    services:     { view: true,  create: false, assign: true,  fulfill: true },
    reports:      { view: false },
    notifications:{ view: true },
  },

  guest: {
    dashboard:    { view: false },
    users:        { view: false, create: false, edit: false,  deactivate: false },
    guests:       { view: false, create: false, edit: false,  delete: false, search: false },
    rooms:        { view: true,  create: false, edit: false,  delete: false, updateStatus: false },
    reservations: { view: true,  create: true,  edit: false,  cancel: true,  checkIn: false, checkOut: false },
    invoices:     { view: true,  create: false, edit: false,  updatePayment: false },
    housekeeping: { view: false, create: false, assign: false, complete: false, reportIssue: false },
    maintenance:  { view: false, create: false, assign: false, resolve: false },
    feedback:     { view: true,  create: true,  respond: false },
    services:     { view: true,  create: true,  assign: false },
    reports:      { view: false },
    notifications:{ view: true },
  },
};

const getPermissions = (role) => ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.guest;

module.exports = { ROLE_PERMISSIONS, getPermissions };
