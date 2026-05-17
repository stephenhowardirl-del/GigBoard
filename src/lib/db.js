import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// ── USERS ──────────────────────────────────────────────

export async function getOrCreateUser(googleUser) {
  const ref = doc(db, 'users', googleUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: googleUser.uid,
      email: googleUser.email,
      name: googleUser.displayName,
      photoURL: googleUser.photoURL,
      role: 'dj',
      venueScope: null,
      createdAt: serverTimestamp(),
    });
    return { uid: googleUser.uid, email: googleUser.email, name: googleUser.displayName, role: 'dj', venueScope: null };
  }
  return { uid: snap.id, ...snap.data() };
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateUserRole(uid, role, venueScope = null) {
  await updateDoc(doc(db, 'users', uid), { role, venueScope });
}

// ── GIGS ───────────────────────────────────────────────

export async function createGig({ venue, date, time, djUid, djName, notes, fee, assignedBy }) {
  return await addDoc(collection(db, 'gigs'), {
    venue, date, time, djUid, djName,
    notes: notes || '',
    fee: fee ? Number(fee) : null,
    status: 'pending',
    assignedBy,
    calendarEventId: null,
    createdAt: serverTimestamp(),
  });
}

export async function getAllGigs() {
  const snap = await getDocs(query(collection(db, 'gigs'), orderBy('date', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getGigsForDJ(djUid) {
  const snap = await getDocs(
    query(collection(db, 'gigs'), where('djUid', '==', djUid), orderBy('date', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getGigsForVenue(venue) {
  const snap = await getDocs(
    query(collection(db, 'gigs'), where('venue', '==', venue), orderBy('date', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateGigStatus(gigId, status, calendarEventId = null) {
  const data = { status };
  if (calendarEventId) data.calendarEventId = calendarEventId;
  await updateDoc(doc(db, 'gigs', gigId), data);
}

export async function updateGig(gigId, { venue, date, time, djUid, djName, notes, fee }) {
  await updateDoc(doc(db, 'gigs', gigId), {
    venue, date, time, djUid, djName,
    notes: notes || '',
    fee: fee ? Number(fee) : null,
    status: 'pending',
  });
}

export async function deleteGig(gigId) {
  await deleteDoc(doc(db, 'gigs', gigId));
}

// ── UNAVAILABILITY ─────────────────────────────────────

export async function setUnavailableDates(uid, dates) {
  await setDoc(doc(db, 'unavailability', uid), { uid, dates, updatedAt: serverTimestamp() });
}

export async function getUnavailableDates(uid) {
  const snap = await getDoc(doc(db, 'unavailability', uid));
  return snap.exists() ? snap.data().dates : [];
}

export async function getAllUnavailability() {
  const snap = await getDocs(collection(db, 'unavailability'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── INVITES ────────────────────────────────────────────

export async function getInvitedEmails() {
  const snap = await getDoc(doc(db, 'settings', 'invites'));
  return snap.exists() ? snap.data().emails : [];
}

export async function saveInvitedEmails(emails) {
  await setDoc(doc(db, 'settings', 'invites'), { emails });
}

export async function isEmailInvited(email) {
  const emails = await getInvitedEmails();
  return emails.map(e => e.toLowerCase().trim()).includes(email.toLowerCase().trim());
}

// ── VENUES ─────────────────────────────────────────────

const DEFAULT_VENUES = [
  'Clancys Cork','JJ Walsh','Dwyers','Seventy Seven',
  'Seventy Seven (brunch)','Seventy Seven (first floor)',
  'Seventy Seven (stamp room)','The Wash','The Pav',
  'The Dean','The Woodford','Mardyke','Wedding','Private Event',
];

export async function getVenues() {
  const snap = await getDoc(doc(db, 'settings', 'venues'));
  return snap.exists() ? snap.data().list : DEFAULT_VENUES;
}

export async function saveVenues(list) {
  await setDoc(doc(db, 'settings', 'venues'), { list });
}
