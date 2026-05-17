import React, { useEffect, useState } from 'react';
import { getAllGigs, createGig, updateGig, deleteGig, getAllUsers, updateUserRole, getAllUnavailability, updateGigStatus, getGigsForDJ, getUnavailableDates, setUnavailableDates, getInvitedEmails, saveInvitedEmails } from '../lib/db';
import { addGigToCalendar } from '../lib/calendar';
import { DJ_COLORS } from '../lib/config';
import { useAuth } from '../hooks/useAuth';
import CalendarView from '../components/CalendarView';
import AssignGigModal from '../components/AssignGigModal';

const DOT_COLORS = ['#00d4aa','#a080ff','#40a0ff','#ff60c0','#ffbb00','#80d040'];

const VENUES = [
  'Clancys Cork','JJ Walsh','Dwyers','Seventy Seven',
  'Seventy Seven (brunch)','Seventy Seven (first floor)',
  'Seventy Seven (stamp room)','The Wash','The Pav',
  'The Dean','The Woodford','Mardyke','Wedding','Private Event',
];

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-IE', { weekday:'short', day:'numeric', month:'short' });
}

function daysUntil(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const gig = new Date(iso + 'T12:00:00');
  return Math.ceil((gig - today) / 86400000);
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab]               = useState('list');
  const [gigs, setGigs]             = useState([]);
  const [myGigs, setMyGigs]         = useState([]);
  const [myUnavail, setMyUnavail]   = useState([]);
  const [users, setUsers]           = useState([]);
  const [unavail, setUnavail]       = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [invites, setInvites]       = useState([]);
  const [newEmail, setNewEmail]     = useState('');
  const [inviteSaved, setInviteSaved] = useState(false);

  async function load() {
    try {
      const [g, u, un, inv] = await Promise.all([
        getAllGigs(), getAllUsers
