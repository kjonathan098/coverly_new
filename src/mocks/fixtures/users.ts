// PLACEHOLDER DATA in the backend's GET /api/user/getUser shape (a User document). Fictional.
// Google OAuth requests only the `profile` scope, so the backend stores a name and no email; its
// profileImage stays empty.
export const userFixture = {
  _id: 'fixtureuser00000000000001',
  name: 'Rae Moreno',
  oAuthID: '100000000000000000001',
  userPlaylists: [],
  profileImage: '',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  __v: 0,
}
