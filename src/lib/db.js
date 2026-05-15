import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
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

export async function createGig({ venue, date, time, djUid, djName, notes, assignedBy }) {
  return await addDoc(collection(db, 'gigs'), {
    venue,
    date,       // ISO string e.g. "2026-05-24"
    time,       // e.g. "22:00–03:00"
    djUid,
    djName,
    notes: notes || '',
    status: 'pending',  // pending | confirmed | rejected
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

// ── UNAVAILABILITY ─────────────────────────────────────

export async function setUnavailableDates(uid, dates) {
  // dates = array of ISO date strings e.g. ["2026-05-17", "2026-05-18"]
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
