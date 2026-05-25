const statFields = [
  ["sinks", "Sinks"],
  ["tinks", "Tinks"],
];

const bigGameStatFields = [
  ["points", "Score"],
  ["tableHits", "Table Hits"],
  ["sinks", "Sinks"],
  ["tinks", "Tinks"],
  ["fgOffense", "Field Goal (Offense)"],
  ["fgDefense", "Field Goal (Defense)"],
  ["fifas", "FIFAs"],
  ["selfSinks", "Self Sinks"],
];

const bigGameCounterFields = bigGameStatFields.filter(([key]) => !["points", "selfSinks"].includes(key));
const allStatFields = [...new Map([...statFields, ...bigGameStatFields])];
const leaguePlayerStatFields = [
  ["tableHits", "Table Hits"],
  ["sinks", "Sinks"],
  ["fgOffense", "Field Goal (Offense)"],
  ["fgDefense", "Field Goal (Defense)"],
  ["tinks", "Tinks"],
  ["fifas", "FIFAs"],
];
const leagueGameDetailStatFields = [
  ["tableHits", "Table Hits"],
  ["sinks", "Sinks"],
  ["tinks", "Tinks"],
  ["fgOffense", "FG Offense"],
  ["fgDefense", "FG Defense"],
  ["selfSinks", "Self Sinks"],
  ["fifas", "FIFAs"],
];
const scoringPointValues = {
  tableHits: 1,
  sinks: 3,
  tinks: 2,
  fgOffense: 2,
  fgDefense: 2,
  fifas: 1,
};
const achievementDefinitions = [
  { key: "sinks", label: "Sink", thresholds: [5, 15, 30, 50] },
  { key: "tinks", label: "Tink", thresholds: [10, 30, 60, 100] },
  { key: "fgOffense", label: "FG Off", thresholds: [15, 40, 80, 150] },
  { key: "fgDefense", label: "FG Def", thresholds: [10, 25, 50, 90] },
  { key: "fifas", label: "FIFA", thresholds: [25, 75, 150, 300] },
  { key: "selfSinks", label: "Self Sink", thresholds: [3, 8, 15, 25] },
  { key: "tableHits", label: "Table Hit", thresholds: [25, 100, 200, 500] },
];
const achievementTiers = ["Copper", "Silver", "Gold", "Diamond"];

const playerRosterKey = "beerDiePlayers";
const supabaseUrl = "https://egkdplyqrkoqgysgossd.supabase.co";
const supabaseKey = "sb_publishable_0tPe5tBwnSAsBf_8OgB68g_362B5XPV";
const vapidPublicKey = "BKu6165rw3XPcgaASzQ2lfauLSALUx9NP6I5Q718K45iCkDLoix74gylYXYr_saA8NwzKbSOZS0NrsCZb_YyBzc";
const authClient = window.supabase?.createClient(supabaseUrl, supabaseKey);
const authDisabledForPreview = false;
let currentUser = null;
let activeLeagueId = "";
let activeLeagueTournamentId = "";
let selectedLeagueRosterMemberId = "";
let selectedLeagueAchievementsMemberId = "";
let activeLeagueGameDetailId = "";
let selectedFriendRequestId = "";
let confirmingUnfriendRequestId = "";
let confirmingLeaveLeague = false;
let editingLeagueGameId = "";
let passwordRecoveryMode = false;
let pendingLeagueInviteId = "";
let showingLeagueQr = false;
let leagueDetailTab = "games";
let editingMyProfile = false;
let leagueCache = [];
let leagueMemberCache = [];
let leagueGameCache = [];
let leagueTournamentCache = [];
let leagueRealtimeChannel = null;
let friendRequestCache = [];
let friendRealtimeChannel = null;
let notificationCache = [];
let notificationRealtimeChannel = null;
let knownNotificationIds = new Set();
let notificationsInitialized = false;
const state = loadState();

const els = {
  splashScreen: document.querySelector("#splashScreen"),
  authShell: document.querySelector("#authShell"),
  appShell: document.querySelector("#appShell"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signInBtn: document.querySelector("#signInBtn"),
  signUpBtn: document.querySelector("#signUpBtn"),
  forgotPasswordBtn: document.querySelector("#forgotPasswordBtn"),
  googleBtn: document.querySelector("#googleBtn"),
  signOutBtn: document.querySelector("#signOutBtn"),
  authMessage: document.querySelector("#authMessage"),
  userEmail: document.querySelector("#userEmail"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  regularForm: document.querySelector("#regularGameForm"),
  regularPlayerGrid: document.querySelector("#regularPlayerGrid"),
  bigGameForm: document.querySelector("#bigGameForm"),
  bigGamePlayerGrid: document.querySelector("#bigGamePlayerGrid"),
  tournamentForm: document.querySelector("#tournamentForm"),
  tournamentSelect: document.querySelector("#tournamentSelect"),
  bracket: document.querySelector("#bracket"),
  showNotificationsBtn: document.querySelector("#showNotificationsBtn"),
  backToLeaguesFromNotificationsBtn: document.querySelector("#backToLeaguesFromNotificationsBtn"),
  notificationsBadge: document.querySelector("#notificationsBadge"),
  notificationList: document.querySelector("#notificationList"),
  notificationToastWrap: document.querySelector("#notificationToastWrap"),
  enablePushBtn: document.querySelector("#enablePushBtn"),
  markNotificationsReadBtn: document.querySelector("#markNotificationsReadBtn"),
  showFriendsBtn: document.querySelector("#showFriendsBtn"),
  backToLeaguesFromFriendsBtn: document.querySelector("#backToLeaguesFromFriendsBtn"),
  friendsBadge: document.querySelector("#friendsBadge"),
  friendInviteForm: document.querySelector("#friendInviteForm"),
  leagueInviteList: document.querySelector("#leagueInviteList"),
  friendRequestList: document.querySelector("#friendRequestList"),
  friendsList: document.querySelector("#friendsList"),
  showLeagueCreateBtn: document.querySelector("#showLeagueCreateBtn"),
  leagueForm: document.querySelector("#leagueForm"),
  leagueList: document.querySelector("#leagueList"),
  backToLeaguesBtn: document.querySelector("#backToLeaguesBtn"),
  backToLeagueGamesBtn: document.querySelector("#backToLeagueGamesBtn"),
  leagueDetailHero: document.querySelector("#leagueDetailHero"),
  leagueGameDetail: document.querySelector("#leagueGameDetail"),
  leagueDetailTabs: document.querySelectorAll("[data-league-detail-tab]"),
  leagueDetailPanels: document.querySelectorAll(".league-detail-panel"),
  leagueGameForm: document.querySelector("#leagueGameForm"),
  leagueGameFormTitle: document.querySelector("#leagueGameFormTitle"),
  leagueGameSubmitBtn: document.querySelector("#leagueGameSubmitBtn"),
  leagueQuickRematchBtn: document.querySelector("#leagueQuickRematchBtn"),
  cancelLeagueGameEditBtn: document.querySelector("#cancelLeagueGameEditBtn"),
  leagueGamePlayerGrid: document.querySelector("#leagueGamePlayerGrid"),
  leagueGameHistory: document.querySelector("#leagueGameHistory"),
  leagueTournamentForm: document.querySelector("#leagueTournamentForm"),
  leagueTournamentSelect: document.querySelector("#leagueTournamentSelect"),
  deleteLeagueTournamentBtn: document.querySelector("#deleteLeagueTournamentBtn"),
  leagueTournamentSummary: document.querySelector("#leagueTournamentSummary"),
  leagueTournamentBracket: document.querySelector("#leagueTournamentBracket"),
  leagueTournamentMatchesList: document.querySelector("#leagueTournamentMatchesList"),
  leagueCompareForm: document.querySelector("#leagueCompareForm"),
  leagueCompareResult: document.querySelector("#leagueCompareResult"),
  leaguePlayerStats: document.querySelector("#leaguePlayerStats"),
  leagueRosterDetail: document.querySelector("#leagueRosterDetail"),
  leagueOverallRankings: document.querySelector("#leagueOverallRankings"),
  leaguePlayerRankings: document.querySelector("#leaguePlayerRankings"),
  leagueTeamRankings: document.querySelector("#leagueTeamRankings"),
  leagueWinRankings: document.querySelector("#leagueWinRankings"),
  leagueSinkRankings: document.querySelector("#leagueSinkRankings"),
  leagueStatsTable: document.querySelector("#leagueStatsTable"),
  leagueSettingsForm: document.querySelector("#leagueSettingsForm"),
  leaveLeagueBtn: document.querySelector("#leaveLeagueBtn"),
  leaveLeagueConfirm: document.querySelector("#leaveLeagueConfirm"),
  confirmLeaveLeagueBtn: document.querySelector("#confirmLeaveLeagueBtn"),
  cancelLeaveLeagueBtn: document.querySelector("#cancelLeaveLeagueBtn"),
  deleteLeagueBtn: document.querySelector("#deleteLeagueBtn"),
  leagueInviteForm: document.querySelector("#leagueInviteForm"),
  leagueInviteLink: document.querySelector("#leagueInviteLink"),
  copyLeagueInviteBtn: document.querySelector("#copyLeagueInviteBtn"),
  toggleLeagueQrBtn: document.querySelector("#toggleLeagueQrBtn"),
  leagueQrBox: document.querySelector("#leagueQrBox"),
  leagueMemberList: document.querySelector("#leagueMemberList"),
  regularGamesList: document.querySelector("#regularGamesList"),
  bigGamesList: document.querySelector("#bigGamesList"),
  bigGameLeaders: document.querySelector("#bigGameLeaders"),
  tournamentMatchesList: document.querySelector("#tournamentMatchesList"),
  tournamentSummary: document.querySelector("#tournamentSummary"),
  overallLeaders: document.querySelector("#overallLeaders"),
  tournamentStats: document.querySelector("#tournamentStats"),
  playerStatsTable: document.querySelector("#playerStatsTable"),
  profileForm: document.querySelector("#profileForm"),
  profileList: document.querySelector("#profileList"),
  settingsPlayersList: document.querySelector("#settingsPlayersList"),
  openRulesBtn: document.querySelector("#openRulesBtn"),
  closeRulesBtn: document.querySelector("#closeRulesBtn"),
  rulesModal: document.querySelector("#rulesModal"),
  openPrivacyBtn: document.querySelector("#openPrivacyBtn"),
  closePrivacyBtn: document.querySelector("#closePrivacyBtn"),
  privacyModal: document.querySelector("#privacyModal"),
  deleteTournamentBtn: document.querySelector("#deleteTournamentBtn"),
  quickRematchBtn: document.querySelector("#quickRematchBtn"),
  openBigGameBtn: document.querySelector("#openBigGameBtn"),
  backToRegularBtn: document.querySelector("#backToRegularBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  resetBtn: document.querySelector("#resetBtn"),
};

window.addEventListener("load", () => {
  window.setTimeout(() => {
    els.splashScreen?.classList.add("is-hidden");
  }, 1150);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "sinkd-notification-target") openNotificationTarget(event.data.target);
  });
}

buildRegularPlayerCards();
buildBigGamePlayerCards();
buildLeagueGamePlayerCards();
bindEvents();
setupAuth();
registerServiceWorker();
render();

function loadState() {
  const saved = localStorage.getItem("beerDieTracker");
  const savedRoster = loadSavedPlayerRoster();
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      regularGames: [],
      bigGames: [],
      tournaments: [],
      activeTournamentId: "",
      playerProfiles: {},
      myProfile: null,
      legacyMyProfile: parsed.myProfile || null,
      accountProfiles: parsed.accountProfiles || {},
      players: mergePlayerNames([...(parsed.players || []), ...savedRoster]),
      ...parsed,
      bigGames: parsed.bigGames || [],
      playerProfiles: parsed.playerProfiles || {},
      legacyMyProfile: parsed.legacyMyProfile || parsed.myProfile || null,
      accountProfiles: parsed.accountProfiles || {},
      myProfile: null,
      players: mergePlayerNames([...(parsed.players || []), ...savedRoster]),
    };
  }

  return {
    regularGames: [],
    bigGames: [],
    tournaments: [],
    players: savedRoster,
    playerProfiles: {},
    myProfile: null,
    legacyMyProfile: null,
    accountProfiles: {},
    activeTournamentId: "",
  };
}

function saveState() {
  saveCurrentProfileForUser();
  state.players = mergePlayerNames(state.players);
  localStorage.setItem(playerRosterKey, JSON.stringify(state.players));
  localStorage.setItem("beerDieTracker", JSON.stringify(state));
}

function loadSavedPlayerRoster() {
  try {
    return mergePlayerNames(JSON.parse(localStorage.getItem(playerRosterKey) || "[]"));
  } catch {
    return [];
  }
}

async function setupAuth() {
  pendingLeagueInviteId = pendingLeagueInviteId || cleanText(new URL(window.location.href).searchParams.get("leagueInvite"));
  if (authDisabledForPreview) {
    setAuthView({
      id: "preview-user",
      email: "preview@local",
    });
    return;
  }

  if (!authClient) {
    showAuthMessage("Login could not load. Check your internet connection and refresh.");
    setAuthView(null);
    return;
  }

  await finishOAuthRedirect();

  const { data, error } = await authClient.auth.getSession();
  if (error) showAuthMessage(error.message);
  setAuthView(data.session?.user || null);
  if (data.session?.user && window.location.hash.includes("type=recovery")) {
    showPasswordRecoveryForm(data.session.user);
  }

  authClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showPasswordRecoveryForm(session?.user || null);
      return;
    }
    setAuthView(session?.user || null);
  });
}

async function finishOAuthRedirect() {
  const url = new URL(window.location.href);
  const authCode = url.searchParams.get("code");
  pendingLeagueInviteId = cleanText(url.searchParams.get("leagueInvite"));
  if (!authCode) return;

  showAuthMessage("Finishing sign in...");
  const { error } = await authClient.auth.exchangeCodeForSession(authCode);
  if (error) {
    showAuthMessage(error.message);
    return;
  }

  url.searchParams.delete("code");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function setAuthView(user) {
  if (currentUser && currentUser.id !== user?.id) {
    saveCurrentProfileForUser(currentUser);
    saveState();
  }
  currentUser = user;
  applyProfileForUser(user);
  hydrateMyProfileFromUser(user);
  const isSignedIn = Boolean(user);
  els.authShell.classList.toggle("hidden", isSignedIn);
  els.appShell.classList.toggle("auth-locked", !isSignedIn);
  els.signOutBtn.hidden = !isSignedIn;
  updateAccountLabel();
  if (isSignedIn) showAuthMessage("");
  if (isSignedIn && !passwordRecoveryMode) restoreAuthButtons();
  if (isSignedIn) {
    consumePendingLeagueInvite();
    loadLeagueData();
    loadFriendData();
    loadNotificationData();
    ensureSavedPushSubscription();
    syncMyLeagueProfile();
    subscribeToLeagueChanges();
    subscribeToFriendChanges();
    subscribeToNotificationChanges();
  } else {
    clearLeagueCloudState();
    clearFriendCloudState();
    clearNotificationCloudState();
  }
  render();
  if (isSignedIn) consumeNotificationHashTarget();
}

function consumeNotificationHashTarget() {
  const target = cleanText(window.location.hash.replace("#", ""));
  if (!target) return;
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  openNotificationTarget(target);
}

function showPasswordRecoveryForm(user) {
  passwordRecoveryMode = true;
  currentUser = user || currentUser;
  els.authShell.classList.remove("hidden");
  els.appShell.classList.add("auth-locked");
  els.signOutBtn.hidden = true;
  els.signInBtn.textContent = "Save New Password";
  els.signUpBtn.classList.add("hidden");
  els.googleBtn.classList.add("hidden");
  els.forgotPasswordBtn.classList.add("hidden");
  els.authEmail.closest("label").classList.add("hidden");
  els.authPassword.value = "";
  els.authPassword.placeholder = "New password";
  showAuthMessage("Enter your new password, then save it.");
}

function restoreAuthButtons() {
  passwordRecoveryMode = false;
  els.signInBtn.textContent = "Sign In";
  els.signUpBtn.classList.remove("hidden");
  els.googleBtn.classList.remove("hidden");
  els.forgotPasswordBtn.classList.remove("hidden");
  els.authEmail.closest("label").classList.remove("hidden");
  els.authPassword.placeholder = "Password";
}

function profileStorageKey(user = currentUser) {
  return user?.id || user?.email?.toLowerCase() || "";
}

function applyProfileForUser(user) {
  const key = profileStorageKey(user);
  state.accountProfiles ||= {};
  state.myProfile = key ? state.accountProfiles[key] || null : null;

  const legacyProfile = state.legacyMyProfile;
  const legacyEmail = cleanText(legacyProfile?.email).toLowerCase();
  if (!state.myProfile && legacyProfile?.nickname && legacyEmail && legacyEmail === user?.email?.toLowerCase()) {
    state.myProfile = { ...legacyProfile };
    state.accountProfiles[key] = { ...state.myProfile };
    state.legacyMyProfile = null;
    saveState();
  }
}

function saveCurrentProfileForUser(user = currentUser) {
  const key = profileStorageKey(user);
  if (!key || !state.myProfile?.nickname) return;
  state.accountProfiles ||= {};
  state.accountProfiles[key] = { ...state.myProfile, email: user?.email || state.myProfile.email || "" };
}

function hydrateMyProfileFromUser(user) {
  const cloudProfile = user?.user_metadata?.sinkd_profile;
  if (!cloudProfile?.nickname) return;

  const localUpdated = Date.parse(state.myProfile?.updatedAt || "");
  const cloudUpdated = Date.parse(cloudProfile.updatedAt || "");
  const shouldUseCloud = !state.myProfile?.nickname || cloudUpdated > localUpdated;
  if (!shouldUseCloud) return;

  state.myProfile = {
    name: cleanText(cloudProfile.name || cloudProfile.nickname),
    nickname: cleanText(cloudProfile.nickname || cloudProfile.name),
    preferredPartner: cleanText(cloudProfile.preferredPartner),
    cupColor: cloudProfile.cupColor || "#d71920",
    notes: cleanText(cloudProfile.notes),
    email: user.email || cloudProfile.email || "",
    updatedAt: cloudProfile.updatedAt || new Date().toISOString(),
  };
  saveCurrentProfileForUser(user);
  rememberPlayers([state.myProfile.nickname]);
  saveState();
}

async function saveMyProfileToCloud() {
  if (!authClient || !currentUser || !state.myProfile?.nickname) return;
  const { error } = await authClient.auth.updateUser({
    data: {
      sinkd_profile: state.myProfile,
    },
  });
  if (error) console.warn(error);
}

async function signInWithEmail() {
  if (passwordRecoveryMode) {
    await completePasswordReset();
    return;
  }

  const email = cleanText(els.authEmail.value);
  const password = els.authPassword.value;
  if (!email || !password) {
    showAuthMessage("Enter your email and password.");
    return;
  }

  showAuthMessage("Signing in...");
  const { error } = await authClient.auth.signInWithPassword({ email, password });
  showAuthMessage(error ? error.message : "");
}

async function completePasswordReset() {
  const password = els.authPassword.value;
  if (!password || password.length < 6) {
    showAuthMessage("Enter a new password with at least 6 characters.");
    return;
  }

  showAuthMessage("Saving new password...");
  const { error } = await authClient.auth.updateUser({ password });
  if (error) {
    showAuthMessage(error.message);
    return;
  }

  restoreAuthButtons();
  showAuthMessage("Password updated. You can sign in now.");
  await authClient.auth.signOut();
  setAuthView(null);
}

async function signUpWithEmail() {
  showAuthMessage("New sign-ups are paused for now.");
  return;

  const email = cleanText(els.authEmail.value);
  const password = els.authPassword.value;
  if (!email || !password) {
    showAuthMessage("Enter an email and password to create an account.");
    return;
  }

  showAuthMessage("Creating account...");
  const { error } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authRedirectUrl(),
    },
  });
  showAuthMessage(error ? error.message : "Account created. Check your email if confirmation is required.");
}

async function sendPasswordReset() {
  const email = cleanText(els.authEmail.value);
  if (!email) {
    showAuthMessage("Enter your email first.");
    els.authEmail.focus();
    return;
  }

  showAuthMessage("Sending reset email...");
  const options = window.location.protocol === "file:" ? {} : { redirectTo: authRedirectUrl() };
  const { error } = await authClient.auth.resetPasswordForEmail(email, options);
  showAuthMessage(error ? error.message : "Password reset email sent. Check your inbox.");
}

async function signInWithGoogle() {
  showAuthMessage("Opening Google...");
  const { error } = await authClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authRedirectUrl(),
    },
  });
  if (error) showAuthMessage(error.message);
}

async function signOut() {
  await authClient.auth.signOut();
  setAuthView(null);
}

function authRedirectUrl() {
  if (window.location.origin && window.location.origin !== "null") {
    return `${window.location.origin}${window.location.pathname}`;
  }
  return window.location.href.split(/[?#]/)[0];
}

function showAuthMessage(message) {
  els.authMessage.textContent = message;
}

function bindEvents() {
  els.signInBtn.addEventListener("click", signInWithEmail);
  els.signUpBtn.addEventListener("click", signUpWithEmail);
  els.forgotPasswordBtn.addEventListener("click", sendPasswordReset);
  els.googleBtn.addEventListener("click", signInWithGoogle);
  els.signOutBtn.addEventListener("click", signOut);
  els.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    signInWithEmail();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.view) switchView(tab.dataset.view);
    });
  });
  els.openBigGameBtn.addEventListener("click", openBigGamePage);
  els.backToRegularBtn.addEventListener("click", () => switchView("regular"));

  els.regularForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const game = readRegularGameForm(new FormData(els.regularForm));
    rememberPlayers(game.teams.flatMap((team) => team.players));
    state.regularGames.unshift(game);
    saveState();
    els.regularForm.reset();
    resetCounters(els.regularForm);
    buildRegularPlayerCards();
    buildBigGamePlayerCards();
    render();
  });

  els.bigGameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const game = readBigGameForm(new FormData(els.bigGameForm));
    rememberPlayers(game.teams.flatMap((team) => team.players));
    state.bigGames.unshift(game);
    saveState();
    els.bigGameForm.reset();
    resetCounters(els.bigGameForm);
    buildRegularPlayerCards();
    buildBigGamePlayerCards();
    render();
  });

  els.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(els.profileForm);
    const nickname = cleanText(form.get("nickname"));
    if (!nickname) return;

    state.myProfile = {
      name: nickname,
      nickname,
      preferredPartner: cleanText(form.get("preferredPartner")),
      cupColor: form.get("cupColor") || "#d71920",
      notes: cleanText(form.get("notes")),
      email: currentUser?.email || state.myProfile?.email || "",
      updatedAt: new Date().toISOString(),
    };
    editingMyProfile = false;
    rememberPlayers([nickname]);
    saveState();
    saveMyProfileToCloud();
    syncMyLeagueProfile();
    buildRegularPlayerCards();
    buildBigGamePlayerCards();
    render();
  });

  els.profileList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-profile]");
    if (!button) return;
    editingMyProfile = true;
    renderProfiles();
    els.profileForm.elements.nickname.focus();
  });

  els.tournamentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(els.tournamentForm);
    const teams = parseTeams(form.get("teams"));
    if (teams.length < 2) {
      alert("Add at least two teams.");
      return;
    }

    const tournament = createTournament(form.get("name").trim(), teams);
    rememberPlayers(teams.flatMap((team) => team.players));
    state.tournaments.unshift(tournament);
    state.activeTournamentId = tournament.id;
    els.tournamentForm.reset();
    saveState();
    buildRegularPlayerCards();
    buildBigGamePlayerCards();
    render();
  });

  els.tournamentSelect.addEventListener("change", () => {
    state.activeTournamentId = els.tournamentSelect.value;
    ensureActiveTournamentMatch(activeTournament());
    saveState();
    render();
  });

  els.bracket.addEventListener("change", (event) => {
    const select = event.target.closest("[data-tournament-match-select]");
    const tournament = activeTournament();
    if (!select || !tournament) return;
    tournament.activeMatchId = select.value;
    saveState();
    renderBracket();
  });

  els.showLeagueCreateBtn.addEventListener("click", () => {
    els.leagueForm.classList.toggle("hidden");
  });

  els.showFriendsBtn.addEventListener("click", () => {
    switchView("friends");
  });

  els.backToLeaguesFromFriendsBtn.addEventListener("click", () => switchView("leagues"));

  els.showNotificationsBtn.addEventListener("click", () => {
    switchView("notifications");
    renderNotifications();
  });

  els.backToLeaguesFromNotificationsBtn.addEventListener("click", () => switchView("leagues"));

  els.markNotificationsReadBtn.addEventListener("click", () => markNotificationsRead());
  els.enablePushBtn.addEventListener("click", enablePushNotifications);
  els.openRulesBtn.addEventListener("click", openRules);
  els.closeRulesBtn.addEventListener("click", closeRules);
  els.rulesModal.addEventListener("click", (event) => {
    if (event.target === els.rulesModal) closeRules();
  });
  els.openPrivacyBtn.addEventListener("click", openPrivacy);
  els.closePrivacyBtn.addEventListener("click", closePrivacy);
  els.privacyModal.addEventListener("click", (event) => {
    if (event.target === els.privacyModal) closePrivacy();
  });

  els.friendInviteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendFriendRequest(new FormData(els.friendInviteForm));
  });

  els.notificationList.addEventListener("click", async (event) => {
    const friendAccept = event.target.closest("[data-friend-accept]");
    const friendDeny = event.target.closest("[data-friend-deny]");
    const accept = event.target.closest("[data-league-invite-accept]");
    const deny = event.target.closest("[data-league-invite-deny]");
    const notificationTarget = event.target.closest("[data-notification-target]");
    if (friendAccept) await updateFriendRequestStatus(friendAccept.dataset.friendAccept, "accepted");
    if (friendDeny) await updateFriendRequestStatus(friendDeny.dataset.friendDeny, "denied");
    if (accept) await acceptLeagueInvite(accept.dataset.leagueInviteAccept);
    if (deny && confirm("Deny this league invite?")) await denyLeagueInvite(deny.dataset.leagueInviteDeny);
    if (notificationTarget) openNotificationTarget(notificationTarget.dataset.notificationTarget);
  });

  els.friendsList.addEventListener("click", async (event) => {
    const inviteToLeague = event.target.closest("[data-invite-friend-league]");
    const unfriend = event.target.closest("[data-unfriend]");
    const confirmUnfriend = event.target.closest("[data-unfriend-confirm]");
    const cancelUnfriend = event.target.closest("[data-unfriend-cancel]");
    const card = event.target.closest("[data-friend-card]");
    if (inviteToLeague) {
      await inviteFriendToLeague(inviteToLeague.dataset.inviteFriendLeague);
      return;
    }
    if (confirmUnfriend) {
      await unfriendRequest(confirmUnfriend.dataset.unfriendConfirm);
      return;
    }
    if (cancelUnfriend) {
      confirmingUnfriendRequestId = "";
      renderFriends();
      return;
    }
    if (unfriend) {
      confirmingUnfriendRequestId = unfriend.dataset.unfriend;
      selectedFriendRequestId = unfriend.dataset.unfriend;
      renderFriends();
      return;
    }
    if (!card) return;
    selectedFriendRequestId = selectedFriendRequestId === card.dataset.friendCard ? "" : card.dataset.friendCard;
    confirmingUnfriendRequestId = "";
    renderFriends();
  });

  els.leagueForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createCloudLeague(new FormData(els.leagueForm));
  });

  els.leagueList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-league]");
    if (!button) return;
    openLeagueDetails(button.dataset.openLeague);
  });

  els.backToLeaguesBtn.addEventListener("click", () => {
    activeLeagueId = "";
    switchView("leagues");
  });

  els.backToLeagueGamesBtn.addEventListener("click", backToLeagueGames);

  els.leagueDetailTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      leagueDetailTab = tab.dataset.leagueDetailTab;
      renderLeagueDetails();
    });
  });

  els.leagueGameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await logCloudLeagueGame(new FormData(els.leagueGameForm));
  });

  els.leagueQuickRematchBtn.addEventListener("click", loadLeagueQuickRematch);

  els.cancelLeagueGameEditBtn.addEventListener("click", () => {
    resetLeagueGameForm();
  });

  els.leagueGameHistory.addEventListener("click", (event) => {
    const gameCardButton = event.target.closest("[data-view-league-game]");
    if (!gameCardButton) return;
    openLeagueGameDetail(gameCardButton.dataset.viewLeagueGame);
  });

  els.leagueTournamentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createCloudLeagueTournament(new FormData(els.leagueTournamentForm));
  });

  els.leagueTournamentSelect.addEventListener("change", async () => {
    activeLeagueTournamentId = els.leagueTournamentSelect.value;
    renderLeagueTournaments();
  });

  els.leagueTournamentBracket.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-league-tournament-match-select]");
    const tournament = activeLeagueTournament();
    if (!select || !tournament) return;
    tournament.activeMatchId = select.value;
    await saveCloudLeagueTournament(tournament);
    renderLeagueTournaments();
  });

  els.leagueTournamentBracket.addEventListener("submit", async (event) => {
    const form = event.target.closest(".league-tournament-match-form");
    if (!form) return;
    event.preventDefault();
    await logLeagueTournamentMatch(form.dataset.tournamentId, form.dataset.matchId, new FormData(form));
  });

  els.deleteLeagueTournamentBtn.addEventListener("click", async () => {
    const tournament = activeLeagueTournament();
    if (!tournament || !canManageActiveLeague()) return;
    if (!confirm(`Delete ${tournament.name}? This removes the league tournament bracket and its logged matches.`)) return;
    await deleteCloudLeagueTournament(tournament.id);
  });

  els.leagueGameDetail.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-detail-edit-league-game]");
    if (!editButton) return;
    backToLeagueGames();
    startLeagueGameEdit(editButton.dataset.detailEditLeagueGame);
  });

  els.leagueCompareForm.addEventListener("change", () => {
    const stats = computeLeagueStats();
    const players = leagueMembers()
      .map((member) => ({ ...member, stats: stats.players[member.display_name.toLowerCase()] || emptyBucket() }))
      .sort((a, b) => b.stats.wins - a.stats.wins || winPercent(b.stats) - winPercent(a.stats) || b.stats.sinks - a.stats.sinks);
    renderLeagueCompare(players);
  });

  els.leagueSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await updateCloudLeagueSettings(new FormData(els.leagueSettingsForm));
  });

  els.leaveLeagueBtn.addEventListener("click", async () => {
    const league = activeLeague();
    if (!league || !myLeagueMember()) return;
    if (isActiveLeagueOwner()) {
      alert("Owners need to transfer ownership or delete the league.");
      return;
    }
    confirmingLeaveLeague = true;
    renderLeagueSettings();
  });

  els.confirmLeaveLeagueBtn.addEventListener("click", async () => {
    await leaveCloudLeague();
  });

  els.cancelLeaveLeagueBtn.addEventListener("click", () => {
    confirmingLeaveLeague = false;
    renderLeagueSettings();
  });

  els.deleteLeagueBtn.addEventListener("click", async () => {
    const league = activeLeague();
    if (!league || !isActiveLeagueOwner()) return;
    if (!confirm(`Delete ${league.name}? This removes its games, roster, and rankings for everyone.`)) return;
    await deleteCloudLeague();
  });

  els.leagueInviteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addCloudLeagueMember(new FormData(els.leagueInviteForm));
  });

  els.copyLeagueInviteBtn.addEventListener("click", async () => {
    await copyLeagueInviteLink();
  });

  els.toggleLeagueQrBtn.addEventListener("click", () => {
    showingLeagueQr = !showingLeagueQr;
    renderLeagueInviteTools();
  });

  els.leaguePlayerStats.addEventListener("click", (event) => {
    if (event.target.closest("[data-add-friend]")) {
      alert("Friend requests are coming when we build the Friends page.");
      return;
    }
    const achievementsButton = event.target.closest("[data-roster-achievements]");
    if (achievementsButton) {
      selectedLeagueAchievementsMemberId =
        selectedLeagueAchievementsMemberId === achievementsButton.dataset.rosterAchievements ? "" : achievementsButton.dataset.rosterAchievements;
      renderLeagueStats();
      return;
    }
    const rosterCard = event.target.closest("[data-roster-member]");
    if (!rosterCard) return;
    selectedLeagueRosterMemberId = selectedLeagueRosterMemberId === rosterCard.dataset.rosterMember ? "" : rosterCard.dataset.rosterMember;
    selectedLeagueAchievementsMemberId = "";
    renderLeagueStats();
  });

  els.leagueRosterDetail.addEventListener("click", (event) => {
    if (!event.target.closest("[data-add-friend]")) return;
    alert("Friend requests are coming when we build the Friends page.");
  });

  els.leagueMemberList.addEventListener("click", async (event) => {
    const promote = event.target.closest("[data-league-promote]");
    const makeRef = event.target.closest("[data-league-ref]");
    const demote = event.target.closest("[data-league-demote]");
    const remove = event.target.closest("[data-league-remove]");
    const transfer = event.target.closest("[data-league-transfer]");
    if (promote) await updateCloudLeagueMemberRole(promote.dataset.leaguePromote, "co_leader");
    if (makeRef) await updateCloudLeagueMemberRole(makeRef.dataset.leagueRef, "ref");
    if (demote) await updateCloudLeagueMemberRole(demote.dataset.leagueDemote, "member");
    if (remove && confirm("Kick this member from the league?")) await removeCloudLeagueMember(remove.dataset.leagueRemove);
    if (transfer && confirm("Transfer league ownership to this member?")) await transferCloudLeagueOwnership(transfer.dataset.leagueTransfer);
  });

  els.exportBtn.addEventListener("click", exportData);
  els.resetBtn.addEventListener("click", () => {
    if (!confirm("Reset games, tournaments, and stats? Saved players will stay.")) return;
    const selectedPlayers = currentRegularPlayerSelections();
    const preservedPlayers = collectAllPlayerNames(selectedPlayers);
    state.regularGames = [];
    state.bigGames = [];
    state.tournaments = [];
    state.players = preservedPlayers;
    state.activeTournamentId = "";
    saveState();
    buildRegularPlayerCards();
    buildBigGamePlayerCards();
    restoreRegularPlayerSelections(selectedPlayers);
    render();
  });

  els.deleteTournamentBtn.addEventListener("click", () => {
    const tournament = activeTournament();
    if (!tournament || !confirm(`Delete ${tournament.name}?`)) return;
    state.tournaments = state.tournaments.filter((item) => item.id !== tournament.id);
    state.activeTournamentId = state.tournaments[0]?.id || "";
    saveState();
    render();
  });

  els.quickRematchBtn.addEventListener("click", loadQuickRematch);

  els.regularGamesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-regular]");
    if (!button) return;
    state.regularGames = state.regularGames.filter((game) => game.id !== button.dataset.deleteRegular);
    saveState();
    render();
  });

  els.bigGamesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-big]");
    if (!button) return;
    state.bigGames = state.bigGames.filter((game) => game.id !== button.dataset.deleteBig);
    saveState();
    render();
  });

  els.settingsPlayersList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-player]");
    if (!button) return;
    const playerName = button.dataset.deletePlayer;
    if (isMyProfileName(playerName)) {
      alert("Your My Profile name stays saved. Change it from My Profile first if you want a different name.");
      return;
    }
    if (!confirm(`Delete ${playerName} from players and logged games?`)) return;
    if (!deletePlayer(playerName)) return;
    saveState();
    buildRegularPlayerCards();
    buildBigGamePlayerCards();
    buildLeagueGamePlayerCards();
    render();
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-counter-action]");
    if (!button) return;
    const input = button.parentElement.querySelector("input");
    const direction = button.dataset.counterAction === "plus" ? 1 : -1;
    input.value = Math.max(0, Number(input.value || 0) + direction);
    updateFormScoreFromCounters(button.closest("form"));
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-self-sink]");
    if (!button) return;
    const form = button.closest("form");
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();

    const wasActive = form.selfSinkPlayer.value === button.dataset.playerNumber;
    form.querySelectorAll("[data-self-sink]").forEach((selfSinkButton) => {
      selfSinkButton.classList.remove("active");
    });
    if (wasActive) {
      form.selfSinkPlayer.value = "";
      form.selfSinkTeam.value = "";
    } else {
      button.classList.add("active");
      form.selfSinkPlayer.value = button.dataset.playerNumber;
      form.selfSinkTeam.value = button.dataset.teamIndex;
    }
    updateFormScoreFromCounters(form);
  });

  document.addEventListener("change", (event) => {
    const select = event.target.closest("[data-player-select]");
    if (!select || select.value !== "__new") return;

    const playerName = cleanText(prompt("Player name"));
    if (!playerName) {
      select.value = "";
      return;
    }

    rememberPlayers([playerName]);
    saveState();
    addPlayerToSelects(playerName);
    select.value = playerName;
  });
}

function switchView(viewName) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
}

function openBigGamePage() {
  buildBigGamePlayerCards();
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "regular"));
  els.views.forEach((view) => view.classList.toggle("active", view.id === "bigView"));
}

function openLeagueDetails(leagueId) {
  activeLeagueId = leagueId;
  selectedLeagueRosterMemberId = "";
  selectedLeagueAchievementsMemberId = "";
  activeLeagueGameDetailId = "";
  leagueDetailTab = "games";
  buildLeagueGamePlayerCards();
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "leagues"));
  els.views.forEach((view) => view.classList.toggle("active", view.id === "leagueDetailsView"));
  renderLeagueDetails();
}

function openLeagueGameDetail(gameId) {
  activeLeagueGameDetailId = gameId;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "leagues"));
  els.views.forEach((view) => view.classList.toggle("active", view.id === "leagueGameDetailView"));
  renderLeagueGameDetail();
}

function backToLeagueGames() {
  leagueDetailTab = "games";
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "leagues"));
  els.views.forEach((view) => view.classList.toggle("active", view.id === "leagueDetailsView"));
  renderLeagueDetails();
}

function loadQuickRematch() {
  const lastGame = state.regularGames[0];
  if (!lastGame) return;

  rememberPlayers(lastGame.teams.flatMap((team) => team.players));
  buildRegularPlayerCards();
  els.regularForm.reset();
  resetCounters(els.regularForm);
  els.regularForm.teamAScore.value = 0;
  els.regularForm.teamBScore.value = 0;
  [...lastGame.teams[0].players, ...lastGame.teams[1].players].forEach((player, index) => {
    const select = els.regularForm.elements[`player${index + 1}_name`];
    if (select) select.value = player;
  });
}

function loadLeagueQuickRematch() {
  const lastGame = leagueGames()[0];
  if (!lastGame) return;

  resetLeagueGameForm();
  els.leagueGameForm.teamAScore.value = 0;
  els.leagueGameForm.teamBScore.value = 0;
  [...lastGame.teams[0].players, ...lastGame.teams[1].players].forEach((player, index) => {
    const select = els.leagueGameForm.elements[`leaguePlayer${index + 1}_name`];
    if (select) select.value = player;
  });
}

function buildStatInputs(container, prefix) {
  container.innerHTML = statFields
    .map(
      ([key, label]) => `
        <label>
          ${label}
          <input name="${prefix}_${key}" type="number" min="0" value="0" required />
        </label>
      `,
    )
    .join("");
}

function buildRegularPlayerCards() {
  const teams = [
    ["Team 1", [1, 2]],
    ["Team 2", [3, 4]],
  ];

  els.regularPlayerGrid.innerHTML = teams
    .map(
      ([teamName, playerNumbers]) => `
        <section class="regular-team-group">
          <h3>${teamName}</h3>
          ${playerNumbers.map((number, index) => playerStatCard(number, `Player ${index + 1}`)).join("")}
        </section>
      `,
    )
    .join("");
}

function buildBigGamePlayerCards() {
  const teams = [
    ["Team 1", [1, 2]],
    ["Team 2", [3, 4]],
  ];

  els.bigGamePlayerGrid.innerHTML = teams
    .map(
      ([teamName, playerNumbers]) => `
        <section class="regular-team-group">
          <h3>${teamName}</h3>
          ${playerNumbers.map((number, index) => bigGamePlayerStatCard(number, `Player ${index + 1}`)).join("")}
        </section>
      `,
    )
    .join("");
}

function buildLeagueGamePlayerCards() {
  const teams = [
    ["Team 1", [1, 2]],
    ["Team 2", [3, 4]],
  ];

  els.leagueGamePlayerGrid.innerHTML = teams
    .map(
      ([teamName, playerNumbers]) => `
        <section class="regular-team-group">
          <h3>${teamName}</h3>
          ${playerNumbers.map((number, index) => leagueGamePlayerStatCard(number, `Player ${index + 1}`)).join("")}
        </section>
      `,
    )
    .join("");
}

function playerStatCard(number, label) {
  const playerPrefix = `player${number}`;
  const teamIndex = number <= 2 ? 0 : 1;
  return `
    <section class="player-stat-card">
      <label class="player-name">
        ${label}
        <select name="${playerPrefix}_name" data-player-select required>
          ${playerOptions()}
        </select>
      </label>
      <div class="counter-list">
        ${statFields.map(([key, statLabel]) => counterControl(`${playerPrefix}_${key}`, statLabel, teamIndex)).join("")}
      </div>
      <button class="self-sink-button" type="button" data-self-sink data-player-number="${number}" data-team-index="${teamIndex}">
        Self Sink
      </button>
    </section>
  `;
}

function leagueGamePlayerStatCard(number, label) {
  const playerPrefix = `leaguePlayer${number}`;
  const teamIndex = number <= 2 ? 0 : 1;
  return `
    <section class="player-stat-card">
      <label class="player-name">
        ${label}
        <select name="${playerPrefix}_name" data-league-player-select required>
          ${leaguePlayerOptions()}
        </select>
      </label>
      <div class="counter-list">
        ${leaguePlayerStatFields.map(([key, statLabel]) => counterControl(`${playerPrefix}_${key}`, statLabel, teamIndex)).join("")}
      </div>
      <button class="self-sink-button" type="button" data-self-sink data-player-number="${number}" data-team-index="${teamIndex}">
        Self Sink
      </button>
    </section>
  `;
}

function bigGamePlayerStatCard(number, label) {
  const playerPrefix = `bigPlayer${number}`;
  const teamIndex = number <= 2 ? 0 : 1;
  return `
    <section class="player-stat-card">
      <label class="player-name">
        ${label}
        <select name="${playerPrefix}_name" data-player-select required>
          ${playerOptions()}
        </select>
      </label>
      <div class="counter-list">
        ${bigGameCounterFields.map(([key, statLabel]) => counterControl(`${playerPrefix}_${key}`, statLabel, teamIndex)).join("")}
      </div>
      <button class="self-sink-button" type="button" data-self-sink data-player-number="${number}" data-team-index="${teamIndex}">
        Self Sink
      </button>
    </section>
  `;
}

function playerOptions() {
  const players = knownPlayers();
  return `
    <option value="">Select player</option>
    ${players.map((player) => `<option value="${escapeHtml(player)}">${escapeHtml(player)}</option>`).join("")}
    <option value="__new">Add new player...</option>
  `;
}

function leaguePlayerOptions() {
  const league = activeLeague();
  const members = league ? leagueMembers(league.id) : [];
  return `
    <option value="">Select player</option>
    ${members.map((member) => `<option value="${escapeHtml(member.display_name)}">${escapeHtml(member.display_name)}</option>`).join("")}
  `;
}

function knownPlayers() {
  return collectLocalPlayerNames();
}

function collectLocalPlayerNames(extraNames = []) {
  const names = [];
  addNames(names, loadSavedPlayerRoster());
  addNames(names, state.players);
  addNames(names, extraNames);
  document.querySelectorAll("[data-player-select]").forEach((select) => {
    if (select.value && select.value !== "__new") names.push(select.value);
  });
  state.regularGames.forEach((game) => addGamePlayerNames(names, game));
  state.bigGames.forEach((game) => addGamePlayerNames(names, game));
  state.tournaments.forEach((tournament) => {
    tournament.teams.forEach((team) => addNames(names, team.players));
    tournament.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        if (match.teamA) addNames(names, match.teamA.players);
        if (match.teamB) addNames(names, match.teamB.players);
        if (match.winner) addNames(names, match.winner.players);
        if (match.game) addGamePlayerNames(names, match.game);
      });
    });
  });

  return mergePlayerNames(names);
}

function collectAllPlayerNames(extraNames = []) {
  return collectLocalPlayerNames(extraNames);
}

function addGamePlayerNames(names, game) {
  game.teams.forEach((team) => {
    addNames(names, team.players);
    if (team.playerStats) addNames(names, Object.keys(team.playerStats));
  });
}

function addNames(names, incomingNames = []) {
  incomingNames.forEach((name) => names.push(name));
}

function rememberPlayers(players) {
  state.players = mergePlayerNames([...collectLocalPlayerNames(), ...players]);
  localStorage.setItem(playerRosterKey, JSON.stringify(state.players));
}

function upsertPlayerProfile(playerName, updates = {}) {
  const cleanName = cleanText(playerName);
  if (!cleanName) return;
  const key = profileKey(cleanName);
  state.playerProfiles ||= {};
  state.playerProfiles[key] = {
    name: cleanName,
    nickname: "",
    notes: "",
    ...(state.playerProfiles[key] || {}),
    ...updates,
    name: cleanName,
  };
}

function profileKey(playerName) {
  return cleanText(playerName).toLowerCase();
}

function mergePlayerNames(players) {
  const unique = new Map();
  players.map(cleanText).filter(Boolean).forEach((name) => {
    const key = name.toLowerCase();
    if (!unique.has(key)) unique.set(key, name);
  });
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

function currentRegularPlayerSelections() {
  return [1, 2, 3, 4]
    .map((number) => cleanText(els.regularForm.elements[`player${number}_name`]?.value))
    .filter(Boolean);
}

function restoreRegularPlayerSelections(players) {
  players.forEach((player, index) => {
    const select = els.regularForm.elements[`player${index + 1}_name`];
    if (select) select.value = player;
  });
}

function addPlayerToSelects(playerName) {
  document.querySelectorAll("[data-player-select]").forEach((select) => {
    const hasOption = [...select.options].some((option) => option.value.toLowerCase() === playerName.toLowerCase());
    if (hasOption) return;

    const option = document.createElement("option");
    option.value = playerName;
    option.textContent = playerName;
    select.insertBefore(option, select.querySelector('option[value="__new"]'));
  });
}

function deletePlayer(playerName) {
  const target = playerName.toLowerCase();
  if (isMyProfileName(playerName)) return false;
  state.players = state.players.filter((player) => player.toLowerCase() !== target);
  if (state.playerProfiles) delete state.playerProfiles[target];
  state.regularGames = state.regularGames
    .map((game) => removePlayerFromGame(game, target))
    .filter(gameHasPlayers);
  state.bigGames = state.bigGames
    .map((game) => removePlayerFromGame(game, target))
    .filter(gameHasPlayers);
  state.tournaments.forEach((tournament) => {
    tournament.teams.forEach((team) => removePlayerFromTeam(team, target));
    tournament.teams = tournament.teams.filter((team) => team.players.length);
    tournament.rounds.forEach((round) => {
      round.matches.forEach((match) => {
        if (match.teamA) removePlayerFromTeam(match.teamA, target);
        if (match.teamB) removePlayerFromTeam(match.teamB, target);
        if (match.winner) removePlayerFromTeam(match.winner, target);
        if (match.game) {
          removePlayerFromGame(match.game, target);
          if (!gameHasPlayers(match.game)) {
            match.game = null;
            match.winner = null;
          }
        }
      });
    });
  });
  localStorage.setItem(playerRosterKey, JSON.stringify(state.players));
  removePlayerFromSelects(target);
  return true;
}

function isMyProfileName(playerName) {
  const nickname = myProfileNickname();
  return !!nickname && nickname.toLowerCase() === cleanText(playerName).toLowerCase();
}

function myProfileNickname() {
  return cleanText(state.myProfile?.nickname || state.myProfile?.name);
}

function removePlayerFromSelects(target) {
  document.querySelectorAll("[data-player-select]").forEach((select) => {
    [...select.options].forEach((option) => {
      if (option.value.toLowerCase() === target) option.remove();
    });
    if (select.value.toLowerCase() === target) select.value = "";
  });
}

function removePlayerFromGame(game, target) {
  game.teams.forEach((team) => removePlayerFromTeam(team, target));
  if (game.selfSinkPlayer?.toLowerCase() === target) {
    game.selfSinkPlayer = "";
    game.selfSinkTeam = null;
  }
  return game;
}

function removePlayerFromTeam(team, target) {
  team.players = team.players.filter((player) => player.toLowerCase() !== target);
  if (team.playerStats) {
    Object.keys(team.playerStats).forEach((player) => {
      if (player.toLowerCase() === target) delete team.playerStats[player];
    });
  }
  team.name = team.players.join(" / ") || team.name;
  team.stats = team.playerStats ? sumStats(Object.values(team.playerStats)) : team.stats;
}

function gameHasPlayers(game) {
  return game.teams.every((team) => team.players.length > 0);
}

function counterControl(name, label, teamIndex = "") {
  const statKey = name.split("_").pop();
  const scorePoints = scoringPointValues[statKey] || 0;
  const teamAttribute = teamIndex === "" ? "" : ` data-team-index="${teamIndex}"`;
  return `
    <div class="counter-row"${teamAttribute} data-score-stat="${statKey}" data-score-points="${scorePoints}">
      <span>${label}</span>
      <div class="counter-control">
        <button type="button" data-counter-action="minus" aria-label="Decrease ${label}">-</button>
        <input name="${name}" type="number" min="0" value="0" readonly />
        <button type="button" data-counter-action="plus" aria-label="Increase ${label}">+</button>
      </div>
    </div>
  `;
}

function staticPlayerStatCard(playerName, prefix) {
  const teamIndex = prefix.startsWith("teamB") ? 1 : 0;
  return `
    <section class="player-stat-card compact-player-card">
      <strong>${escapeHtml(playerName)}</strong>
      <div class="counter-list">
        ${statFields.map(([key, statLabel]) => counterControl(`${prefix}_${key}`, statLabel, teamIndex)).join("")}
      </div>
    </section>
  `;
}

function staticBigPlayerStatCard(playerName, prefix, playerNumber, teamIndex) {
  return `
    <section class="player-stat-card compact-player-card">
      <strong>${escapeHtml(playerName)}</strong>
      <div class="counter-list">
        ${bigGameCounterFields.map(([key, statLabel]) => counterControl(`${prefix}_${key}`, statLabel, teamIndex)).join("")}
      </div>
      <button class="self-sink-button" type="button" data-self-sink data-player-number="${playerNumber}" data-team-index="${teamIndex}">
        Self Sink
      </button>
    </section>
  `;
}

function resetCounters(form) {
  form.querySelectorAll(".counter-control input").forEach((input) => {
    input.value = 0;
  });
  form.querySelectorAll("[data-self-sink]").forEach((button) => {
    button.classList.remove("active");
  });
  if (form.selfSinkPlayer) form.selfSinkPlayer.value = "";
  if (form.selfSinkTeam) form.selfSinkTeam.value = "";
  updateFormScoreFromCounters(form);
}

function updateFormScoreFromCounters(form) {
  if (!form?.teamAScore || !form?.teamBScore) return;
  const scores = [0, 0];
  form.querySelectorAll(".counter-row[data-score-points]").forEach((row) => {
    const teamIndex = Number(row.dataset.teamIndex);
    const points = Number(row.dataset.scorePoints) || 0;
    const input = row.querySelector("input");
    if (!Number.isInteger(teamIndex) || teamIndex < 0 || teamIndex > 1 || !points || !input) return;
    scores[teamIndex] += (Number(input.value) || 0) * points;
  });
  form.teamAScore.value = scores[0];
  form.teamBScore.value = scores[1];
}

function readRegularGameForm(form) {
  const selfSinkTeam = form.get("selfSinkTeam") === "" ? null : Number(form.get("selfSinkTeam"));
  const selfSinkPlayer = form.get("selfSinkPlayer") === "" ? null : Number(form.get("selfSinkPlayer"));
  const players = [1, 2, 3, 4].map((number) => ({
    name: cleanText(form.get(`player${number}_name`)),
    stats: readPlayerStats(form, `player${number}`),
  }));

  const teamA = {
    name: players.slice(0, 2).map((player) => player.name).join(" / "),
    players: players.slice(0, 2).map((player) => player.name),
    playerStats: Object.fromEntries(players.slice(0, 2).map((player) => [player.name, player.stats])),
    score: Number(form.get("teamAScore")) || 0,
    stats: sumStats(players.slice(0, 2).map((player) => player.stats)),
  };
  const teamB = {
    name: players.slice(2, 4).map((player) => player.name).join(" / "),
    players: players.slice(2, 4).map((player) => player.name),
    playerStats: Object.fromEntries(players.slice(2, 4).map((player) => [player.name, player.stats])),
    score: Number(form.get("teamBScore")) || 0,
    stats: sumStats(players.slice(2, 4).map((player) => player.stats)),
  };

  const winnerIndex = selfSinkTeam === null ? (teamA.score >= teamB.score ? 0 : 1) : selfSinkTeam === 0 ? 1 : 0;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "regular",
    tournamentId: "",
    teams: [teamA, teamB],
    winnerIndex,
    selfSinkPlayer: selfSinkPlayer ? players[selfSinkPlayer - 1]?.name : "",
    selfSinkTeam,
  };
}

function readBigGameForm(form) {
  const selfSinkTeam = form.get("selfSinkTeam") === "" ? null : Number(form.get("selfSinkTeam"));
  const selfSinkPlayer = form.get("selfSinkPlayer") === "" ? null : Number(form.get("selfSinkPlayer"));
  const players = [1, 2, 3, 4].map((number) => ({
    name: cleanText(form.get(`bigPlayer${number}_name`)),
    stats: readBigPlayerStats(form, `bigPlayer${number}`),
  }));

  if (selfSinkPlayer) {
    players[selfSinkPlayer - 1].stats.selfSinks += 1;
  }

  const teamA = {
    name: players.slice(0, 2).map((player) => player.name).join(" / "),
    players: players.slice(0, 2).map((player) => player.name),
    playerStats: Object.fromEntries(players.slice(0, 2).map((player) => [player.name, player.stats])),
    score: Number(form.get("teamAScore")) || 0,
    stats: sumStats(players.slice(0, 2).map((player) => player.stats)),
  };
  const teamB = {
    name: players.slice(2, 4).map((player) => player.name).join(" / "),
    players: players.slice(2, 4).map((player) => player.name),
    playerStats: Object.fromEntries(players.slice(2, 4).map((player) => [player.name, player.stats])),
    score: Number(form.get("teamBScore")) || 0,
    stats: sumStats(players.slice(2, 4).map((player) => player.stats)),
  };

  const winnerIndex = selfSinkTeam === null ? (teamA.score >= teamB.score ? 0 : 1) : selfSinkTeam === 0 ? 1 : 0;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "big",
    tournamentId: "",
    teams: [teamA, teamB],
    winnerIndex,
    selfSinkPlayer: selfSinkPlayer ? players[selfSinkPlayer - 1]?.name : "",
    selfSinkTeam,
  };
}

function readGameForm(form, source, tournamentId = "") {
  const teamAPlayers = splitPlayers(form.get("teamAPlayers"));
  const teamBPlayers = splitPlayers(form.get("teamBPlayers"));
  const teamAPlayerStats = playerStatsFromNames(form, "teamA", teamAPlayers);
  const teamBPlayerStats = playerStatsFromNames(form, "teamB", teamBPlayers);
  const teamA = {
    name: cleanText(form.get("teamAName")) || "Team 1",
    players: teamAPlayers,
    score: Number(form.get("teamAScore")) || 0,
    playerStats: teamAPlayerStats,
    stats: sumStats(Object.values(teamAPlayerStats)),
  };
  const teamB = {
    name: cleanText(form.get("teamBName")) || "Team 2",
    players: teamBPlayers,
    score: Number(form.get("teamBScore")) || 0,
    playerStats: teamBPlayerStats,
    stats: sumStats(Object.values(teamBPlayerStats)),
  };

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source,
    tournamentId,
    teams: [teamA, teamB],
    winnerIndex: teamA.score >= teamB.score ? 0 : 1,
  };
}

function readTournamentGameForm(form, match, tournamentId) {
  const selfSinkTeam = form.get("selfSinkTeam") === "" ? null : Number(form.get("selfSinkTeam"));
  const selfSinkPlayer = form.get("selfSinkPlayer") === "" ? null : Number(form.get("selfSinkPlayer"));
  const teamAPlayers = match.teamA.players.map((name, index) => ({
    name,
    stats: readBigPlayerStats(form, `tournamentPlayer${index + 1}`),
  }));
  const teamBPlayers = match.teamB.players.map((name, index) => ({
    name,
    stats: readBigPlayerStats(form, `tournamentPlayer${teamAPlayers.length + index + 1}`),
  }));
  const players = [...teamAPlayers, ...teamBPlayers];

  if (selfSinkPlayer) players[selfSinkPlayer - 1].stats.selfSinks += 1;

  const teamA = buildGameTeam(teamAPlayers, Number(form.get("teamAScore")) || 0);
  const teamB = buildGameTeam(teamBPlayers, Number(form.get("teamBScore")) || 0);
  const winnerIndex = selfSinkTeam === null ? (teamA.score >= teamB.score ? 0 : 1) : selfSinkTeam === 0 ? 1 : 0;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "tournament",
    tournamentId,
    teams: [teamA, teamB],
    winnerIndex,
    selfSinkPlayer: selfSinkPlayer ? players[selfSinkPlayer - 1]?.name : "",
    selfSinkTeam,
  };
}

function readTeamStats(form, prefix) {
  const stats = Object.fromEntries(statFields.map(([key]) => [key, Number(form.get(`${prefix}_${key}`)) || 0]));
  stats.points = pointsFromStats(stats);
  return stats;
}

function readPlayerStats(form, prefix) {
  const stats = Object.fromEntries(statFields.map(([key]) => [key, Number(form.get(`${prefix}_${key}`)) || 0]));
  stats.points = pointsFromStats(stats);
  return stats;
}

function readBigPlayerStats(form, prefix) {
  const stats = Object.fromEntries(bigGameStatFields.map(([key]) => [key, Number(form.get(`${prefix}_${key}`)) || 0]));
  stats.points = pointsFromStats(stats);
  return stats;
}

function readLeaguePlayerStats(form, prefix) {
  const stats = Object.fromEntries(allStatFields.map(([key]) => [key, Number(form.get(`${prefix}_${key}`)) || 0]));
  stats.points = pointsFromStats(stats);
  return stats;
}

function pointsFromStats(stats) {
  return Object.entries(scoringPointValues).reduce((total, [key, points]) => total + (Number(stats[key]) || 0) * points, 0);
}

function playerStatsFromNames(form, teamPrefix, players) {
  return Object.fromEntries(players.map((player, index) => [player, readPlayerStats(form, `${teamPrefix}_player${index + 1}`)]));
}

function sumStats(statSets) {
  return Object.fromEntries(
    allStatFields.map(([key]) => [key, statSets.reduce((total, stats) => total + (stats[key] || 0), 0)]),
  );
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizedLeagueName(value) {
  return cleanText(value).replace(/\s+/g, " ").toLowerCase();
}

function leagueNameExists(name, ignoredLeagueId = "") {
  const normalizedName = normalizedLeagueName(name);
  return Boolean(normalizedName) && leagueCache.some((league) => league.id !== ignoredLeagueId && normalizedLeagueName(league.name) === normalizedName);
}

function splitPlayers(value) {
  return String(value || "")
    .split(",")
    .map((player) => player.trim())
    .filter(Boolean);
}

function parseTeams(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [namePart, playersPart] = line.includes(":") ? line.split(":") : [`Team ${index + 1}`, line];
      return {
        id: crypto.randomUUID(),
        name: cleanText(namePart) || `Team ${index + 1}`,
        players: splitPlayers(playersPart),
      };
    })
    .filter((team) => team.players.length);
}

function createTournament(name, teams) {
  const bracketSize = nextPowerOfTwo(teams.length);
  const entries = [...teams, ...Array(bracketSize - teams.length).fill(null)];
  const rounds = [];
  const roundCount = Math.log2(bracketSize);

  rounds.push({
    name: roundName(0, roundCount),
    matches: pairTeams(entries).map(([teamA, teamB], index) => ({
      id: crypto.randomUUID(),
      roundIndex: 0,
      matchIndex: index,
      teamA,
      teamB,
      game: null,
      winner: teamB ? null : teamA,
    })),
  });

  for (let roundIndex = 1; roundIndex < roundCount; roundIndex += 1) {
    rounds.push({
      name: roundName(roundIndex, roundCount),
      matches: Array.from({ length: bracketSize / 2 ** (roundIndex + 1) }, (_, matchIndex) => ({
        id: crypto.randomUUID(),
        roundIndex,
        matchIndex,
        teamA: null,
        teamB: null,
        game: null,
        winner: null,
      })),
    });
  }

  const tournament = {
    id: crypto.randomUUID(),
    name: cleanText(name) || "Sinkd Tournament",
    createdAt: new Date().toISOString(),
    teams,
    rounds,
  };

  advanceByes(tournament);
  return tournament;
}

function pairTeams(entries) {
  const pairs = [];
  for (let index = 0; index < entries.length; index += 2) {
    pairs.push([entries[index], entries[index + 1]]);
  }
  return pairs;
}

function nextPowerOfTwo(value) {
  return 2 ** Math.ceil(Math.log2(value));
}

function roundName(roundIndex, roundCount) {
  if (roundIndex === roundCount - 1) return "Final";
  if (roundIndex === roundCount - 2) return "Semifinals";
  return `Round ${roundIndex + 1}`;
}

function activeTournament() {
  return state.tournaments.find((tournament) => tournament.id === state.activeTournamentId) || state.tournaments[0];
}

function tournamentMatches(tournament) {
  return tournament?.rounds.flatMap((round) => round.matches) || [];
}

function readyTournamentMatches(tournament) {
  return tournamentMatches(tournament).filter((match) => match.teamA && match.teamB);
}

function playableTournamentMatches(tournament) {
  return readyTournamentMatches(tournament).filter((match) => !match.game);
}

function ensureActiveTournamentMatch(tournament) {
  if (!tournament) return null;
  const readyMatches = readyTournamentMatches(tournament);
  const activeMatch = readyMatches.find((match) => match.id === tournament.activeMatchId);
  if (activeMatch) return activeMatch;

  const nextMatch = playableTournamentMatches(tournament)[0] || readyMatches[0] || null;
  tournament.activeMatchId = nextMatch?.id || "";
  return nextMatch;
}

function selectedTournamentMatch(tournament) {
  if (!tournament) return null;
  return ensureActiveTournamentMatch(tournament);
}

function activeLeague() {
  return leagueCache.find((league) => league.id === activeLeagueId) || null;
}

function leagueMembers(leagueId = activeLeagueId) {
  return leagueMemberCache
    .filter((member) => member.league_id === leagueId)
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.display_name.localeCompare(b.display_name));
}

function leagueGames(leagueId = activeLeagueId) {
  return leagueGameCache
    .filter((game) => game.leagueId === leagueId || game.league_id === leagueId)
    .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
}

function leagueTournaments(leagueId = activeLeagueId) {
  return leagueTournamentCache
    .filter((tournament) => tournament.leagueId === leagueId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

function activeLeagueTournament() {
  const tournaments = leagueTournaments();
  if (!tournaments.length) return null;
  const tournament = tournaments.find((item) => item.id === activeLeagueTournamentId) || tournaments[0];
  activeLeagueTournamentId = tournament.id;
  return tournament;
}

function leagueTournamentGames(leagueId = activeLeagueId) {
  return leagueTournaments(leagueId)
    .flatMap((tournament) =>
      tournament.rounds.flatMap((round) =>
        round.matches
          .map((match) => match.game)
          .filter(Boolean)
          .map((game) => ({ ...game, source: "league_tournament", leagueId, leagueTournamentId: tournament.id })),
      ),
    )
    .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
}

function leagueStatGames(leagueId = activeLeagueId) {
  return [...leagueGames(leagueId), ...leagueTournamentGames(leagueId)].sort(
    (a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at),
  );
}

function myLeagueMember(leagueId = activeLeagueId) {
  const email = currentUser?.email?.toLowerCase();
  return leagueMemberCache.find(
    (member) => member.league_id === leagueId && (member.user_id === currentUser?.id || member.email?.toLowerCase() === email),
  );
}

function canManageActiveLeague() {
  return ["owner", "co_leader"].includes(myLeagueMember()?.role);
}

function canLogActiveLeagueGames() {
  return ["owner", "co_leader", "ref"].includes(myLeagueMember()?.role);
}

function canInviteActiveLeague() {
  return Boolean(myLeagueMember());
}

function isActiveLeagueOwner() {
  return myLeagueMember()?.role === "owner";
}

function roleRank(role) {
  return role === "owner" ? 0 : role === "co_leader" ? 1 : role === "ref" ? 2 : 3;
}

function displayRole(role) {
  return role === "co_leader" ? "Co-Leader" : role === "owner" ? "Owner" : role === "ref" ? "Ref" : "Member";
}

async function loadLeagueData() {
  if (!authClient || !currentUser) return;
  const email = currentUser.email || "";
  const { data: memberships, error: membershipError } = await authClient
    .from("league_members")
    .select("*")
    .or(`user_id.eq.${currentUser.id},email.eq.${email}`);

  if (membershipError) {
    console.warn(membershipError);
    return;
  }

  const memberLeagueIds = [...new Set((memberships || []).map((member) => member.league_id))];
  const { data: openLeagues, error: openLeagueError } = await authClient.from("leagues").select("*").eq("privacy", "open");
  if (openLeagueError) console.warn(openLeagueError);
  const openLeagueIds = (openLeagues || []).map((league) => league.id);
  const leagueIds = [...new Set([...memberLeagueIds, ...openLeagueIds])];
  if (!leagueIds.length) {
    leagueCache = [];
    leagueMemberCache = [];
    leagueGameCache = [];
    leagueTournamentCache = [];
    render();
    return;
  }

  const [{ data: memberLeagues }, { data: members }, { data: games }, { data: leagueTournaments }] = await Promise.all([
    memberLeagueIds.length ? authClient.from("leagues").select("*").in("id", memberLeagueIds) : Promise.resolve({ data: [] }),
    authClient.from("league_members").select("*").in("league_id", leagueIds),
    authClient.from("league_games").select("*").in("league_id", leagueIds).order("created_at", { ascending: false }),
    authClient.from("league_tournaments").select("*").in("league_id", leagueIds).order("updated_at", { ascending: false }),
  ]);

  leagueCache = [...new Map([...(openLeagues || []), ...(memberLeagues || [])].map((league) => [league.id, league])).values()];
  leagueMemberCache = members || [];
  leagueGameCache = (games || []).map(normalizeLeagueGame);
  leagueTournamentCache = (leagueTournaments || []).map(normalizeLeagueTournament);
  if (activeLeagueId && !leagueCache.some((league) => league.id === activeLeagueId)) activeLeagueId = "";
  if (activeLeagueTournamentId && !leagueTournamentCache.some((tournament) => tournament.id === activeLeagueTournamentId)) activeLeagueTournamentId = "";
  buildLeagueGamePlayerCards();
  render();
}

function subscribeToLeagueChanges() {
  if (!authClient || leagueRealtimeChannel) return;
  leagueRealtimeChannel = authClient
    .channel("beer-die-leagues")
    .on("postgres_changes", { event: "*", schema: "public", table: "leagues" }, loadLeagueData)
    .on("postgres_changes", { event: "*", schema: "public", table: "league_members" }, loadLeagueData)
    .on("postgres_changes", { event: "*", schema: "public", table: "league_games" }, loadLeagueData)
    .on("postgres_changes", { event: "*", schema: "public", table: "league_tournaments" }, loadLeagueData)
    .subscribe();
}

function clearLeagueCloudState() {
  if (leagueRealtimeChannel) {
    authClient.removeChannel(leagueRealtimeChannel);
    leagueRealtimeChannel = null;
  }
  activeLeagueId = "";
  leagueCache = [];
  leagueMemberCache = [];
  leagueGameCache = [];
  leagueTournamentCache = [];
  activeLeagueTournamentId = "";
}

async function loadFriendData() {
  if (!authClient || !currentUser) return;
  const email = currentUser.email || "";
  const { data, error } = await authClient
    .from("friend_requests")
    .select("*")
    .or(`requester_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id},recipient_email.eq.${email}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn(error);
    friendRequestCache = [];
    renderFriends();
    return;
  }
  friendRequestCache = data || [];
  renderFriends();
}

function subscribeToFriendChanges() {
  if (!authClient || friendRealtimeChannel) return;
  friendRealtimeChannel = authClient
    .channel("sinkd-friends")
    .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, loadFriendData)
    .subscribe();
}

function clearFriendCloudState() {
  if (friendRealtimeChannel) {
    authClient.removeChannel(friendRealtimeChannel);
    friendRealtimeChannel = null;
  }
  friendRequestCache = [];
  renderFriends();
}

async function loadNotificationData() {
  if (!authClient || !currentUser) return;
  const email = currentUser.email || "";
  const { data, error } = await authClient
    .from("notifications")
    .select("*")
    .or(`recipient_id.eq.${currentUser.id},recipient_email.eq.${email}`)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    console.warn(error);
    notificationCache = [];
    renderNotifications();
    return;
  }
  const previousIds = new Set(knownNotificationIds);
  notificationCache = data || [];
  knownNotificationIds = new Set(notificationCache.map((notification) => notification.id));
  if (notificationsInitialized) {
    notificationCache
      .filter((notification) => !notification.read_at && !previousIds.has(notification.id))
      .slice(0, 3)
      .forEach(showBrowserNotification);
  }
  notificationsInitialized = true;
  renderNotifications();
}

function subscribeToNotificationChanges() {
  if (!authClient || notificationRealtimeChannel) return;
  notificationRealtimeChannel = authClient
    .channel("sinkd-notifications")
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadNotificationData)
    .subscribe();
}

function clearNotificationCloudState() {
  if (notificationRealtimeChannel) {
    authClient.removeChannel(notificationRealtimeChannel);
    notificationRealtimeChannel = null;
  }
  notificationCache = [];
  knownNotificationIds = new Set();
  notificationsInitialized = false;
  renderNotifications();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
  } catch (error) {
    console.warn(error);
  }
}

async function enablePushNotifications() {
  if (!("Notification" in window)) {
    alert("Push notifications are not available in this browser.");
    return;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Push notifications are not available in this browser. On iPhone, add Sinkd to your Home Screen first.");
    return;
  }
  if (!vapidPublicKey) {
    alert("Push notifications need VAPID keys added before closed-app alerts can work.");
    return;
  }
  if (Notification.permission === "granted" && pushNotificationsEnabled()) {
    localStorage.setItem("sinkdPushEnabled", "false");
    await removePushSubscription();
    updatePushButton();
    return;
  }
  const permission = await Notification.requestPermission();
  localStorage.setItem("sinkdPushEnabled", permission === "granted" ? "true" : "false");
  if (permission === "granted") await savePushSubscription();
  updatePushButton();
  if (permission !== "granted") alert("Notifications were not enabled.");
}

function pushNotificationsEnabled() {
  return localStorage.getItem("sinkdPushEnabled") !== "false" && (!("Notification" in window) || Notification.permission !== "denied");
}

function updatePushButton() {
  if (!els.enablePushBtn) return;
  const on = pushNotificationsEnabled() && (!("Notification" in window) || Notification.permission === "granted");
  els.enablePushBtn.textContent = on ? "Notifications On" : "Notifications Off";
}

async function ensureSavedPushSubscription() {
  if (!currentUser || !pushNotificationsEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!vapidPublicKey) return;
  await savePushSubscription();
}

async function savePushSubscription() {
  if (!authClient || !currentUser) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const subscriptionJson = subscription.toJSON();
  const { error } = await authClient.from("push_subscriptions").upsert(
    {
      user_id: currentUser.id,
      email: currentUser.email || "",
      endpoint: subscription.endpoint,
      subscription: subscriptionJson,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) console.warn(error);
}

async function removePushSubscription() {
  if (!authClient || !currentUser || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await subscription.unsubscribe().catch(() => false);
  const { error } = await authClient.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint).eq("user_id", currentUser.id);
  if (error) console.warn(error);
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function openRules() {
  els.rulesModal.classList.remove("hidden");
  els.rulesModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeRules() {
  els.rulesModal.classList.add("hidden");
  els.rulesModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openPrivacy() {
  els.privacyModal.classList.remove("hidden");
  els.privacyModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closePrivacy() {
  els.privacyModal.classList.add("hidden");
  els.privacyModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function showBrowserNotification(notification) {
  if (document.visibilityState === "visible") {
    showNotificationToast(notification);
    return;
  }
  if (!pushNotificationsEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const payload = {
    body: notification.message || "New notification",
    icon: notification.image_url || "assets/app-icon.png",
    badge: "assets/app-icon.png",
    tag: notification.id,
    data: { linkTarget: notification.link_target || "notifications" },
  };
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    if (registration) {
      registration.showNotification(notification.title || "Sinkd", payload);
      return;
    }
  }
  new Notification(notification.title || "Sinkd", payload);
}

function showNotificationToast(notification) {
  if (!els.notificationToastWrap) return;
  const toast = document.createElement("button");
  toast.className = `notification-toast notification-toast-${notification.type || "general"}`;
  toast.type = "button";
  toast.dataset.notificationTarget = notification.link_target || "notifications";
  const image = cleanText(notification.image_url);
  toast.innerHTML = `
    ${image ? `<img src="${escapeHtml(image)}" alt="" />` : '<span class="notification-toast-icon">S</span>'}
    <span><strong>${escapeHtml(notification.title || "Sinkd")}</strong><small>${escapeHtml(notification.message || "New notification")}</small></span>
  `;
  toast.addEventListener("click", () => {
    toast.remove();
    openNotificationTarget(toast.dataset.notificationTarget);
  });
  els.notificationToastWrap.appendChild(toast);
  window.setTimeout(() => toast.remove(), 6500);
}

function openNotificationTarget(target = "") {
  const normalized = cleanText(target) || "notifications";
  if (normalized === "friends") {
    switchView("friends");
    renderFriends();
    return;
  }
  if (normalized === "leagues") {
    switchView("leagues");
    renderLeagues();
    return;
  }
  if (normalized === "notifications") {
    switchView("notifications");
    renderNotifications();
  }
}

async function createNotification({ recipientId = null, recipientEmail = "", leagueId = null, type, title, message, linkTarget = "", imageUrl = "" }) {
  if (!authClient || !currentUser || (!recipientId && !recipientEmail)) return;
  const { data, error } = await authClient.from("notifications").insert({
    recipient_id: recipientId,
    recipient_email: cleanText(recipientEmail).toLowerCase(),
    league_id: leagueId,
    type,
    title,
    message,
    link_target: linkTarget,
    image_url: imageUrl,
  }).select("*").single();
  if (error) console.warn(error);
  if (!error && data) await triggerPushNotification(data);
}

async function triggerPushNotification(notification) {
  if (!authClient || !notification?.id) return;
  const { error } = await authClient.functions.invoke("send-push", {
    body: { notificationId: notification.id },
  });
  if (error) console.warn(error);
}

async function createLeagueNotifications(leagueId, notification, options = {}) {
  const members = leagueMembers(leagueId).filter((member) => member.user_id || member.email);
  await Promise.all(
    members
      .filter((member) => !options.excludeCurrentUser || member.user_id !== currentUser?.id)
      .map((member) =>
        createNotification({
          recipientId: member.user_id || null,
          recipientEmail: member.email || "",
          leagueId,
          ...notification,
        }),
      ),
  );
}

async function markNotificationsRead(types = null) {
  if (!authClient || !currentUser) return;
  let query = authClient
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .or(`recipient_id.eq.${currentUser.id},recipient_email.eq.${currentUser.email || ""}`);
  if (types?.length) query = query.in("type", types);
  const { error } = await query;
  if (error) console.warn(error);
  await loadNotificationData();
}

async function sendFriendRequest(form) {
  if (!authClient || !currentUser) return;
  const recipientEmail = cleanText(form.get("email")).toLowerCase();
  if (!recipientEmail) return;
  if (recipientEmail === currentUser.email?.toLowerCase()) {
    alert("You cannot invite yourself.");
    return;
  }

  const { error } = await authClient.from("friend_requests").insert({
    requester_id: currentUser.id,
    requester_email: currentUser.email,
    requester_name: myProfileNickname() || profileNameFromEmail(currentUser.email),
    recipient_email: recipientEmail,
    status: "pending",
  });
  if (error) {
    alert(error.message);
    return;
  }
  els.friendInviteForm.reset();
  await createNotification({
    recipientEmail,
    type: "friend_request",
    title: "New friend request",
    message: `${myProfileNickname() || profileNameFromEmail(currentUser.email)} sent you a friend request.`,
    linkTarget: "friends",
  });
  await loadFriendData();
}

async function updateFriendRequestStatus(requestId, status) {
  if (!authClient || !currentUser) return;
  const request = friendRequestCache.find((item) => item.id === requestId);
  const { error } = await authClient
    .from("friend_requests")
    .update({
      status,
      recipient_id: currentUser.id,
      recipient_name: myProfileNickname() || profileNameFromEmail(currentUser.email),
      recipient_email: currentUser.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) alert(error.message);
  if (!error && status === "accepted" && request) {
    await createNotification({
      recipientId: request.requester_id,
      recipientEmail: request.requester_email,
      type: "friend_request",
      title: "Friend request accepted",
      message: `${myProfileNickname() || profileNameFromEmail(currentUser.email)} accepted your friend request.`,
      linkTarget: "friends",
    });
  }
  await loadFriendData();
}

async function unfriendRequest(requestId) {
  if (!authClient || !currentUser) return;
  const { error } = await authClient.from("friend_requests").delete().eq("id", requestId);
  if (error) alert(error.message);
  if (selectedFriendRequestId === requestId) selectedFriendRequestId = "";
  if (confirmingUnfriendRequestId === requestId) confirmingUnfriendRequestId = "";
  await loadFriendData();
}

async function inviteFriendToLeague(requestId) {
  if (!authClient || !currentUser) return;
  const request = friendRequestCache.find((item) => item.id === requestId);
  const friend = request ? friendInfo(request) : null;
  if (!friend?.email) return;

  const leagues = leagueCache.filter((league) => myLeagueMember(league.id));
  if (!leagues.length) {
    alert("Join or create a league first.");
    return;
  }

  const league =
    leagues.length === 1
      ? leagues[0]
      : chooseLeagueForInvite(leagues);
  if (!league) return;

  if (leagueMembers(league.id).some((member) => member.email?.toLowerCase() === friend.email.toLowerCase())) {
    alert(`${friend.name} is already in ${league.name}.`);
    return;
  }

  const { error } = await authClient.from("league_members").insert({
    league_id: league.id,
    email: friend.email.toLowerCase(),
    display_name: friend.name,
    nickname: "",
    role: "member",
  });
  if (error) {
    alert(error.message);
    return;
  }
  await createNotification({
    recipientEmail: friend.email,
    leagueId: league.id,
    type: "league_invite",
    title: "League invite",
    message: `${myProfileNickname() || profileNameFromEmail(currentUser.email)} invited you to ${league.name}.`,
    linkTarget: "friends",
  });
  alert(`Invite sent to ${friend.name} for ${league.name}.`);
  await loadLeagueData();
}

function chooseLeagueForInvite(leagues) {
  const options = leagues.map((league, index) => `${index + 1}. ${league.name}`).join("\n");
  const choice = Number(window.prompt(`Invite to which league?\n${options}`));
  return leagues[choice - 1] || null;
}

async function acceptLeagueInvite(memberId) {
  const invite = leagueMemberCache.find((member) => member.id === memberId);
  if (!invite) return;
  const nickname = myProfileNickname();
  const { error } = await authClient
    .from("league_members")
    .update({
      user_id: currentUser.id,
      email: currentUser.email,
      display_name: nickname || profileNameFromEmail(currentUser.email),
      nickname,
      cup_color: state.myProfile?.cupColor || "#d71920",
    })
    .eq("id", memberId);
  if (error) {
    alert(error.message);
    return;
  }
  const league = leagueCache.find((item) => item.id === invite.league_id);
  await createLeagueNotifications(invite.league_id, {
    type: "league_invite",
    title: "League invite accepted",
    message: `${nickname || profileNameFromEmail(currentUser.email)} joined ${league?.name || "the league"}.`,
    linkTarget: "leagues",
  });
  await loadLeagueData();
  activeLeagueId = invite.league_id;
  switchView("leagues");
  openLeagueDetails(invite.league_id);
}

async function denyLeagueInvite(memberId) {
  if (!authClient || !currentUser) return;
  const { error } = await authClient.from("league_members").delete().eq("id", memberId);
  if (error) alert(error.message);
  await loadLeagueData();
}

async function leaveCloudLeague() {
  const member = myLeagueMember();
  if (!authClient || !member || member.role === "owner") return;
  const { error } = await authClient.from("league_members").delete().eq("id", member.id);
  if (error) {
    alert(error.message);
    return;
  }
  activeLeagueId = "";
  leagueDetailTab = "games";
  confirmingLeaveLeague = false;
  await loadLeagueData();
  switchView("leagues");
}

async function createCloudLeague(form) {
  if (!currentUser) return;
  const leagueName = cleanText(form.get("name")) || "New League";
  if (leagueNameExists(leagueName)) {
    alert("A league with that name already exists. Pick a different name.");
    return;
  }
  const leagueId = crypto.randomUUID();
  const leaguePayload = {
    id: leagueId,
    owner_id: currentUser.id,
    name: leagueName,
    description: cleanText(form.get("description")),
    privacy: form.get("privacy") === "invite" ? "invite" : "open",
    logo_top: form.get("logoTop") || "#EFBF04",
    logo_left: form.get("logoLeft") || "#ffffff",
    logo_right: form.get("logoRight") || "#4f7fc8",
  };

  const { error } = await authClient.from("leagues").insert(leaguePayload);
  if (error) {
    alert(error.code === "23505" ? "A league with that name already exists. Pick a different name." : error.message);
    return;
  }

  const ownerName = myProfileNickname() || profileNameFromEmail(currentUser.email);
  const cupColor = state.myProfile?.cupColor || "#d71920";
  await authClient
    .from("league_members")
    .update({ display_name: ownerName, nickname: ownerName, cup_color: cupColor, email: currentUser.email, user_id: currentUser.id })
    .eq("league_id", leagueId)
    .eq("role", "owner");

  els.leagueForm.reset();
  els.leagueForm.classList.add("hidden");
  activeLeagueId = leagueId;
  await loadLeagueData();
  openLeagueDetails(leagueId);
}

async function updateCloudLeagueSettings(form) {
  if (!canManageActiveLeague()) return;
  const leagueName = cleanText(form.get("name")) || "New League";
  if (leagueNameExists(leagueName, activeLeagueId)) {
    alert("A league with that name already exists. Pick a different name.");
    return;
  }
  const { error } = await authClient
    .from("leagues")
    .update({
      name: leagueName,
      description: cleanText(form.get("description")),
      privacy: form.get("privacy") === "invite" ? "invite" : "open",
      logo_top: form.get("logoTop") || "#EFBF04",
      logo_left: form.get("logoLeft") || "#ffffff",
      logo_right: form.get("logoRight") || "#4f7fc8",
    })
    .eq("id", activeLeagueId);
  if (error) {
    alert(error.code === "23505" ? "A league with that name already exists. Pick a different name." : error.message);
    return;
  }
  await loadLeagueData();
}

async function deleteCloudLeague() {
  if (!isActiveLeagueOwner()) return;
  const { error } = await authClient.from("leagues").delete().eq("id", activeLeagueId);
  if (error) {
    alert(error.message);
    return;
  }

  activeLeagueId = "";
  leagueDetailTab = "games";
  await loadLeagueData();
  switchView("leagues");
}

async function addCloudLeagueMember(form) {
  if (!canInviteActiveLeague()) return;
  const members = leagueMembers();
  if (members.length >= 50) {
    alert("This league is full. Leagues are capped at 50 members.");
    return;
  }

  const email = cleanText(form.get("email")).toLowerCase();
  if (email === currentUser?.email?.toLowerCase()) {
    alert("You are already in this league.");
    return;
  }
  const displayName = profileNameFromEmail(email);
  if (members.some((member) => member.email?.toLowerCase() === email)) {
    alert("That member is already in this league.");
    return;
  }

  const { error } = await authClient.from("league_members").insert({
    league_id: activeLeagueId,
    email,
    display_name: displayName,
    nickname: "",
    role: "member",
  });
  if (error) alert(error.message);
  els.leagueInviteForm.reset();
  if (!error) {
    await createNotification({
      recipientEmail: email,
      leagueId: activeLeagueId,
      type: "league_invite",
      title: "League invite",
      message: `${myProfileNickname() || profileNameFromEmail(currentUser.email)} invited you to ${activeLeague()?.name || "a league"}.`,
      linkTarget: "friends",
    });
  }
  await loadLeagueData();
}

async function consumePendingLeagueInvite() {
  if (!authClient || !currentUser || !pendingLeagueInviteId) return;
  const leagueId = pendingLeagueInviteId;
  pendingLeagueInviteId = "";

  const existingMember = leagueMemberCache.some((member) => member.league_id === leagueId && (member.user_id === currentUser.id || member.email?.toLowerCase() === currentUser.email?.toLowerCase()));
  if (!existingMember) {
    const nickname = myProfileNickname();
    const { error } = await authClient.from("league_members").insert({
      league_id: leagueId,
      email: currentUser.email,
      display_name: nickname || profileNameFromEmail(currentUser.email),
      nickname: "",
      role: "member",
    });
    if (error && error.code !== "23505") {
      alert(error.message);
      return;
    }
    await createNotification({
      recipientEmail: currentUser.email,
      leagueId,
      type: "league_invite",
      title: "League invite added",
      message: "Your league invite is ready to accept.",
      linkTarget: "friends",
    });
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("leagueInvite");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  await loadLeagueData();
  switchView("friends");
  alert("League invite added to your inbox. Accept it from League Invites when you're ready.");
}

async function syncMyLeagueProfile() {
  const nickname = myProfileNickname();
  if (!authClient || !currentUser || !nickname) return;
  const cupColor = state.myProfile?.cupColor || "#d71920";

  const { error: rpcError } = await authClient.rpc("update_my_league_profile", {
    profile_name: nickname,
    profile_cup_color: cupColor,
  });
  if (!rpcError) {
    await loadLeagueData();
    return;
  }

  const matchingMembers = leagueMemberCache.filter((member) => member.user_id === currentUser.id);

  if (matchingMembers.length) {
    await Promise.all(
      matchingMembers.map((member) =>
        authClient
          .from("league_members")
          .update({
            display_name: nickname,
            nickname,
            cup_color: cupColor,
            user_id: currentUser.id,
            email: currentUser.email,
          })
          .eq("id", member.id),
      ),
    );
  }

  await loadLeagueData();
}

async function updateCloudLeagueMemberRole(memberId, role) {
  if (!isActiveLeagueOwner()) return;
  const { error } = await authClient.from("league_members").update({ role }).eq("id", memberId).neq("role", "owner");
  if (error) alert(error.message);
  await loadLeagueData();
}

async function removeCloudLeagueMember(memberId) {
  if (!canManageActiveLeague()) return;
  const { error } = await authClient.from("league_members").delete().eq("id", memberId).neq("role", "owner");
  if (error) alert(error.message);
  await loadLeagueData();
}

async function transferCloudLeagueOwnership(memberId) {
  if (!isActiveLeagueOwner()) return;
  const league = activeLeague();
  const newOwner = leagueMembers().find((member) => member.id === memberId);
  const oldOwner = myLeagueMember();
  if (!league || !newOwner || !oldOwner) return;
  if (newOwner.role !== "co_leader" || !newOwner.user_id) {
    alert("Ownership can only be transferred to a co-leader.");
    return;
  }

  const { error: leagueError } = await authClient.from("leagues").update({ owner_id: newOwner.user_id }).eq("id", league.id);
  if (leagueError) {
    alert(leagueError.message);
    return;
  }

  await authClient.from("league_members").update({ role: "co_leader" }).eq("id", oldOwner.id);
  await authClient.from("league_members").update({ role: "owner" }).eq("id", newOwner.id);
  await loadLeagueData();
}

async function logCloudLeagueGame(form) {
  if (!canLogActiveLeagueGames()) return;
  const beforeStats = computeLeagueStats();
  const beforeAchievementRanks = leagueAchievementRanks(beforeStats);
  const beforeLeaders = leagueRankingLeaders(beforeStats);
  const game = readLeagueGameForm(form);
  const payload = {
    league_id: activeLeagueId,
    logged_by: currentUser.id,
    team_a_players: game.teams[0].players,
    team_b_players: game.teams[1].players,
    team_a_score: game.teams[0].score,
    team_b_score: game.teams[1].score,
    winner_index: game.winnerIndex,
    player_stats: game.playerStats,
    self_sink_player: game.selfSinkPlayer,
    self_sink_team: game.selfSinkTeam,
  };
  const request = editingLeagueGameId
    ? authClient.from("league_games").update(payload).eq("id", editingLeagueGameId)
    : authClient.from("league_games").insert(payload);
  const { error } = await request;
  if (error) {
    alert(error.message);
    return;
  }

  resetLeagueGameForm();
  await loadLeagueData();
  const afterStats = computeLeagueStats();
  await notifyLeagueAchievementUnlocks(beforeAchievementRanks, afterStats);
  await notifyLeagueRankingChanges(beforeLeaders, leagueRankingLeaders(afterStats));
}

async function createCloudLeagueTournament(form) {
  if (!canLogActiveLeagueGames()) return;
  const name = cleanText(form.get("name"));
  const teams = parseTeams(form.get("teams"));
  if (!name) {
    alert("Add a tournament name.");
    return;
  }
  if (teams.length < 2) {
    alert("Add at least two teams.");
    return;
  }

  const tournament = createTournament(name, teams);
  const payload = {
    league_id: activeLeagueId,
    created_by: currentUser.id,
    data: leagueTournamentPayload(tournament),
  };
  const { data, error } = await authClient.from("league_tournaments").insert(payload).select("id").single();
  if (error) {
    alert(error.message);
    return;
  }

  activeLeagueTournamentId = data.id;
  els.leagueTournamentForm.reset();
  await loadLeagueData();
}

async function saveCloudLeagueTournament(tournament) {
  if (!tournament || !canLogActiveLeagueGames()) return;
  const { error } = await authClient
    .from("league_tournaments")
    .update({ data: leagueTournamentPayload(tournament), updated_at: new Date().toISOString() })
    .eq("id", tournament.id);
  if (error) alert(error.message);
}

async function deleteCloudLeagueTournament(tournamentId) {
  const { error } = await authClient.from("league_tournaments").delete().eq("id", tournamentId);
  if (error) {
    alert(error.message);
    return;
  }
  activeLeagueTournamentId = "";
  await loadLeagueData();
}

function leagueTournamentPayload(tournament) {
  return {
    name: tournament.name,
    teams: tournament.teams,
    rounds: tournament.rounds,
    activeMatchId: tournament.activeMatchId || "",
  };
}

async function logLeagueTournamentMatch(tournamentId, matchId, form) {
  if (!canLogActiveLeagueGames()) return;
  const tournament = leagueTournaments().find((item) => item.id === tournamentId);
  const match = tournament?.rounds.flatMap((round) => round.matches).find((item) => item.id === matchId);
  if (!tournament || !match || match.game) return;

  const beforeStats = computeLeagueStats();
  const beforeAchievementRanks = leagueAchievementRanks(beforeStats);
  const beforeLeaders = leagueRankingLeaders(beforeStats);
  const game = readTournamentGameForm(form, match, tournament.id);
  game.source = "league_tournament";
  game.leagueId = activeLeagueId;
  game.leagueTournamentId = tournament.id;
  match.game = game;
  match.winner = game.winnerIndex === 0 ? match.teamA : match.teamB;
  advanceWinner(tournament, match);
  advanceByes(tournament);
  tournament.activeMatchId = playableTournamentMatches(tournament)[0]?.id || match.id;
  await saveCloudLeagueTournament(tournament);
  await loadLeagueData();
  const afterStats = computeLeagueStats();
  await notifyLeagueAchievementUnlocks(beforeAchievementRanks, afterStats);
  await notifyLeagueRankingChanges(beforeLeaders, leagueRankingLeaders(afterStats));
}

function resetLeagueGameForm() {
  editingLeagueGameId = "";
  els.leagueGameForm.reset();
  resetCounters(els.leagueGameForm);
  buildLeagueGamePlayerCards();
  els.leagueGameForm.editingLeagueGameId.value = "";
  els.leagueGameFormTitle.textContent = "Log League Game";
  els.leagueGameSubmitBtn.textContent = "Log League Game";
  els.cancelLeagueGameEditBtn.classList.add("hidden");
}

function startLeagueGameEdit(gameId) {
  if (!canLogActiveLeagueGames()) return;
  const game = leagueGames().find((item) => item.id === gameId);
  if (!game) return;
  leagueDetailTab = "games";
  editingLeagueGameId = game.id;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === "leagues"));
  els.views.forEach((view) => view.classList.toggle("active", view.id === "leagueDetailsView"));
  renderLeagueDetails();
  els.leagueGameForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function populateLeagueGameForm(game) {
  buildLeagueGamePlayerCards();
  const form = els.leagueGameForm;
  form.teamAScore.value = game.teams[0].score || 0;
  form.teamBScore.value = game.teams[1].score || 0;
  form.editingLeagueGameId.value = game.id;
  const players = [...game.teams[0].players, ...game.teams[1].players];
  players.forEach((playerName, index) => {
    const playerNumber = index + 1;
    const stats = game.playerStats?.[playerName] || emptyLeagueStats();
    const select = form.elements[`leaguePlayer${playerNumber}_name`];
    if (select) select.value = playerName;
    leaguePlayerStatFields.forEach(([key]) => {
      const input = form.elements[`leaguePlayer${playerNumber}_${key}`];
      if (input) input.value = stats[key] || 0;
    });
  });
  updateFormScoreFromCounters(form);

  form.selfSinkPlayer.value = "";
  form.selfSinkTeam.value = "";
  form.querySelectorAll("[data-self-sink]").forEach((button) => button.classList.remove("active"));
  if (game.selfSinkPlayer) {
    const selfSinkIndex = players.findIndex((playerName) => playerName === game.selfSinkPlayer);
    if (selfSinkIndex >= 0) {
      const button = form.querySelector(`[data-self-sink][data-player-number="${selfSinkIndex + 1}"]`);
      if (button) {
        button.classList.add("active");
        form.selfSinkPlayer.value = String(selfSinkIndex + 1);
        form.selfSinkTeam.value = button.dataset.teamIndex;
      }
    }
  }

  els.leagueGameFormTitle.textContent = "Edit League Game";
  els.leagueGameSubmitBtn.textContent = "Save Game";
  els.cancelLeagueGameEditBtn.classList.remove("hidden");
}

function readLeagueGameForm(form) {
  const selfSinkTeam = form.get("selfSinkTeam") === "" ? null : Number(form.get("selfSinkTeam"));
  const selfSinkPlayer = form.get("selfSinkPlayer") === "" ? null : Number(form.get("selfSinkPlayer"));
  const players = [1, 2, 3, 4].map((number) => ({
    name: cleanText(form.get(`leaguePlayer${number}_name`)),
    stats: readLeaguePlayerStats(form, `leaguePlayer${number}`),
  }));

  if (selfSinkPlayer) players[selfSinkPlayer - 1].stats.selfSinks += 1;

  const teamA = buildGameTeam(players.slice(0, 2), Number(form.get("teamAScore")) || 0);
  const teamB = buildGameTeam(players.slice(2, 4), Number(form.get("teamBScore")) || 0);
  const winnerIndex = selfSinkTeam === null ? (teamA.score >= teamB.score ? 0 : 1) : selfSinkTeam === 0 ? 1 : 0;
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source: "league",
    leagueId: activeLeagueId,
    teams: [teamA, teamB],
    winnerIndex,
    playerStats: Object.fromEntries(players.map((player) => [player.name, player.stats])),
    selfSinkPlayer: selfSinkPlayer ? players[selfSinkPlayer - 1]?.name : "",
    selfSinkTeam,
  };
}

function buildGameTeam(players, score) {
  return {
    name: players.map((player) => player.name).join(" / "),
    players: players.map((player) => player.name),
    playerStats: Object.fromEntries(players.map((player) => [player.name, player.stats])),
    score,
    stats: sumStats(players.map((player) => player.stats)),
  };
}

function normalizeLeagueGame(row) {
  const playerStats = row.player_stats || {};
  const teamAPlayers = row.team_a_players || [];
  const teamBPlayers = row.team_b_players || [];
  const teamAStats = Object.fromEntries(teamAPlayers.map((player) => [player, playerStats[player] || emptyLeagueStats()]));
  const teamBStats = Object.fromEntries(teamBPlayers.map((player) => [player, playerStats[player] || emptyLeagueStats()]));
  return {
    id: row.id,
    createdAt: row.created_at,
    created_at: row.created_at,
    source: "league",
    leagueId: row.league_id,
    league_id: row.league_id,
    teams: [
      {
        name: teamAPlayers.join(" / "),
        players: teamAPlayers,
        score: row.team_a_score || 0,
        playerStats: teamAStats,
        stats: sumStats(Object.values(teamAStats)),
      },
      {
        name: teamBPlayers.join(" / "),
        players: teamBPlayers,
        score: row.team_b_score || 0,
        playerStats: teamBStats,
        stats: sumStats(Object.values(teamBStats)),
      },
    ],
    winnerIndex: row.winner_index,
    selfSinkPlayer: row.self_sink_player || "",
    selfSinkTeam: row.self_sink_team,
    playerStats,
  };
}

function normalizeLeagueTournament(row) {
  const data = row.data || {};
  return {
    ...data,
    id: row.id,
    leagueId: row.league_id,
    league_id: row.league_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    teams: data.teams || [],
    rounds: data.rounds || [],
    activeMatchId: data.activeMatchId || "",
  };
}

function emptyLeagueStats() {
  return Object.fromEntries(allStatFields.map(([key]) => [key, 0]));
}

function profileNameFromEmail(email) {
  return cleanText(email).split("@")[0] || "Player";
}

function render() {
  updateAccountLabel();
  renderTournamentSelect();
  renderRegularGames();
  renderBigGames();
  renderLeagues();
  renderLeagueDetails();
  renderLeagueGameDetail();
  renderBracket();
  renderMatchHistory();
  renderStats();
  renderProfiles();
  renderSettings();
  renderQuickRematch();
  renderFriends();
  renderNotifications();
}

function updateAccountLabel() {
  els.userEmail.textContent = currentUser ? myProfileNickname() || profileNameFromEmail(currentUser.email) : "";
}

function renderQuickRematch() {
  els.quickRematchBtn.disabled = !state.regularGames.length;
}

function renderTournamentSelect() {
  if (!state.tournaments.length) {
    els.tournamentSelect.innerHTML = '<option value="">No tournaments yet</option>';
    els.tournamentSummary.innerHTML = "";
    return;
  }

  if (!activeTournament()) state.activeTournamentId = state.tournaments[0].id;
  els.tournamentSelect.innerHTML = state.tournaments
    .map((tournament) => `<option value="${tournament.id}">${escapeHtml(tournament.name)}</option>`)
    .join("");
  els.tournamentSelect.value = activeTournament().id;
}

function renderRegularGames() {
  if (!state.regularGames.length) {
    els.regularGamesList.innerHTML = '<p class="empty">No regular games logged yet.</p>';
    return;
  }

  els.regularGamesList.innerHTML = state.regularGames
    .slice(0, 8)
    .map((game) => gameCard(game))
    .join("");
}

function renderBigGames() {
  if (!state.bigGames.length) {
    els.bigGamesList.innerHTML = '<p class="empty">No big games logged yet.</p>';
  } else {
    els.bigGamesList.innerHTML = state.bigGames
      .slice(0, 8)
      .map((game) => gameCard(game))
      .join("");
  }

  const players = Object.values(computeBigGameStats())
    .filter((player) => player.overall.games)
    .sort(
      (a, b) =>
        b.overall.points - a.overall.points ||
        b.overall.tableHits - a.overall.tableHits ||
        b.overall.sinks - a.overall.sinks,
    );

  els.bigGameLeaders.innerHTML = players.length
    ? players.slice(0, 5).map(bigGameLeaderCard).join("")
    : '<p class="empty">No big game stats yet.</p>';
}

function gameCard(game) {
  const [teamA, teamB] = game.teams;
  const winner = game.teams[game.winnerIndex];
  const selfSinkNote = game.selfSinkPlayer
    ? `<div class="meta-line self-sink-note">${escapeHtml(game.selfSinkPlayer)} self sank. ${escapeHtml(winner.name)} wins.</div>`
    : "";
  const deleteButton =
    game.source === "regular"
      ? `<button class="text-button danger-text" type="button" data-delete-regular="${game.id}">Remove</button>`
      : game.source === "big"
        ? `<button class="text-button danger-text" type="button" data-delete-big="${game.id}">Remove</button>`
        : "";
  const leagueDetailTarget = game.source === "league" ? ` data-view-league-game="${game.id}" tabindex="0" role="button"` : "";
  return `
    <article class="game-card"${leagueDetailTarget}>
      <strong>${escapeHtml(teamA.name)} ${teamA.score} - ${teamB.score} ${escapeHtml(teamB.name)}</strong>
      ${selfSinkNote}
      <div class="card-actions">${deleteButton}</div>
      <div class="meta-line">Winner: ${escapeHtml(winner.name)} · ${formatDate(game.createdAt)}</div>
      <div class="meta-line">${statSummary(teamA)} · ${statSummary(teamB)}</div>
    </article>
  `;
}

function statSummary(team) {
  if (team.stats.tableHits || team.stats.points || team.stats.fgOffense || team.stats.fgDefense) {
    return `${escapeHtml(team.name)}: ${team.score} score, ${team.stats.tableHits || 0} table hits, ${team.stats.sinks || 0} sinks, ${team.stats.tinks || 0} tinks`;
  }
  return `${escapeHtml(team.name)}: ${team.stats.sinks} sinks, ${team.stats.tinks} tinks`;
}

function renderBracket() {
  const tournament = activeTournament();
  if (!tournament) {
    els.bracket.innerHTML = '<section class="panel"><p class="empty">Create a tournament to see the bracket.</p></section>';
    return;
  }

  const champion = tournament.rounds.at(-1).matches[0]?.winner;
  const completedMatches = tournament.rounds.flatMap((round) => round.matches).filter((match) => match.game).length;
  els.tournamentSummary.innerHTML = `
    <div class="summary-item"><b>${tournament.teams.length}</b><span>Teams</span></div>
    <div class="summary-item"><b>${completedMatches}</b><span>Matches</span></div>
    <div class="summary-item"><b>${escapeHtml(champion?.name || "Open")}</b><span>Champion</span></div>
  `;

  const readyMatches = readyTournamentMatches(tournament);
  const match = selectedTournamentMatch(tournament);
  if (!readyMatches.length || !match) {
    els.bracket.innerHTML = '<section class="panel"><p class="empty">Waiting for the next matchup.</p></section>';
    return;
  }

  els.bracket.innerHTML = `
    <section class="panel tournament-match-picker">
      <label>
        Matchup
        <select data-tournament-match-select>
          ${readyMatches.map((item) => tournamentMatchOption(tournament, item, match.id)).join("")}
        </select>
      </label>
    </section>
    ${matchCard(tournament, match)}
  `;

  const form = els.bracket.querySelector(".match-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    logTournamentMatch(tournament.id, form.dataset.matchId, new FormData(form));
  });
}

function tournamentMatchOption(tournament, match, activeMatchId) {
  return `
    <option value="${match.id}" ${match.id === activeMatchId ? "selected" : ""}>
      ${escapeHtml(tournamentMatchLabel(tournament, match))}${match.game ? " - Logged" : ""}
    </option>
  `;
}

function tournamentMatchLabel(tournament, match) {
  const roundNameText = tournament.rounds[match.roundIndex]?.name || `Round ${match.roundIndex + 1}`;
  return `${roundNameText}, Game ${match.matchIndex + 1}: ${match.teamA?.name || "TBD"} vs ${match.teamB?.name || "TBD"}`;
}

function matchCard(tournament, match) {
  const canLog = match.teamA && match.teamB && !match.game;
  const pending = !match.teamA || !match.teamB;
  const teamsHtml = [match.teamA, match.teamB]
    .map((team) => {
      const isWinner = match.winner?.id === team?.id;
      return `<div class="team-line ${isWinner ? "winner" : ""}">
        <span>${escapeHtml(team?.name || "TBD")}</span>
        <span>${match.game ? match.game.teams[team?.id === match.teamA?.id ? 0 : 1].score : ""}</span>
      </div>`;
    })
    .join("");

  let formHtml = "";
  if (canLog) {
    formHtml = tournamentMatchForm(match);
  }

  return `
    <article class="match-card ${pending ? "pending" : ""}">
      <strong>${escapeHtml(tournamentMatchLabel(tournament, match))}</strong>
      ${teamsHtml}
      ${match.game ? `<div class="meta-line">Logged ${formatDate(match.game.createdAt)}</div>` : ""}
      ${formHtml}
    </article>
  `;
}

function tournamentMatchForm(match) {
  return `
    <form class="match-form tournament-big-form" data-match-id="${match.id}">
      <div class="score-grid">
        <label>
          ${escapeHtml(match.teamA.name)} Score
          <input name="teamAScore" type="number" min="0" value="0" required />
        </label>
        <label>
          ${escapeHtml(match.teamB.name)} Score
          <input name="teamBScore" type="number" min="0" value="0" required />
        </label>
      </div>
      <div class="match-player-stats">
        ${tournamentPlayerStatsForm(match)}
      </div>
      <input type="hidden" name="selfSinkPlayer" value="" />
      <input type="hidden" name="selfSinkTeam" value="" />
      <button class="primary-button" type="submit">Log Tournament Game</button>
    </form>
  `;
}

function tournamentPlayerStatsForm(match) {
  let playerNumber = 1;
  const teamAPlayers = match.teamA.players
    .map((player, index) => staticBigPlayerStatCard(player, `tournamentPlayer${index + 1}`, playerNumber++, 0))
    .join("");
  const teamBPlayers = match.teamB.players
    .map((player, index) => staticBigPlayerStatCard(player, `tournamentPlayer${match.teamA.players.length + index + 1}`, playerNumber++, 1))
    .join("");

  return `
    <section class="regular-team-group">
      <h3>${escapeHtml(match.teamA.name)}</h3>
      ${teamAPlayers}
    </section>
    <section class="regular-team-group">
      <h3>${escapeHtml(match.teamB.name)}</h3>
      ${teamBPlayers}
    </section>
  `;
}

function logTournamentMatch(tournamentId, matchId, form) {
  const tournament = state.tournaments.find((item) => item.id === tournamentId);
  const match = tournament.rounds.flatMap((round) => round.matches).find((item) => item.id === matchId);
  if (!match || match.game) return;

  const game = readTournamentGameForm(form, match, tournament.id);
  match.game = game;
  match.winner = game.winnerIndex === 0 ? match.teamA : match.teamB;
  advanceWinner(tournament, match);
  advanceByes(tournament);
  tournament.activeMatchId = playableTournamentMatches(tournament)[0]?.id || match.id;
  saveState();
  render();
}

function advanceWinner(tournament, match) {
  const nextRound = tournament.rounds[match.roundIndex + 1];
  if (!nextRound) return;
  const nextMatch = nextRound.matches[Math.floor(match.matchIndex / 2)];
  const slot = match.matchIndex % 2 === 0 ? "teamA" : "teamB";
  nextMatch[slot] = match.winner;
}

function advanceByes(tournament) {
  tournament.rounds[0].matches.forEach((match) => {
    if (!match.winner && ((match.teamA && !match.teamB) || (!match.teamA && match.teamB))) {
      match.winner = match.teamA || match.teamB;
      advanceWinner(tournament, match);
    }
  });
}

function renderMatchHistory() {
  const tournament = activeTournament();
  if (!tournament) {
    els.tournamentMatchesList.innerHTML = '<p class="empty">No tournament selected.</p>';
    return;
  }

  const games = tournament.rounds.flatMap((round) => round.matches.map((match) => match.game).filter(Boolean));
  if (!games.length) {
    els.tournamentMatchesList.innerHTML = '<p class="empty">No tournament matches logged yet.</p>';
    return;
  }

  els.tournamentMatchesList.innerHTML = games
    .slice()
    .reverse()
    .map((game) => gameCard(game))
    .join("");
}

function renderLeagues() {
  if (!currentUser) {
    els.leagueList.innerHTML = '<p class="empty">Sign in to view leagues.</p>';
    return;
  }

  els.leagueList.innerHTML = leagueCache.length
    ? leagueCache.map(leagueCard).join("")
    : '<section class="panel"><p class="empty">No leagues yet. Create one to get started.</p></section>';
}

function renderFriends() {
  const friends = acceptedFriends();
  els.friendsBadge.classList.add("hidden");

  els.friendsList.innerHTML = friends.length
    ? friends.map(friendRow).join("")
    : '<p class="empty">No friends added yet.</p>';
}

function renderNotifications() {
  const actionNotifications = [
    ...pendingLeagueInvites().map((invite) => ({ actionType: "league_invite", created_at: invite.created_at, data: invite })),
    ...pendingIncomingFriendRequests().map((request) => ({ actionType: "friend_request", created_at: request.created_at, data: request })),
  ];
  const passiveNotifications = notificationCache.filter((notification) => {
    if (!["friend_request", "league_invite"].includes(notification.type)) return true;
    const title = notification.title?.toLowerCase() || "";
    return title !== "new friend request" && title !== "league invite";
  });
  const rows = [...actionNotifications, ...passiveNotifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unreadCount = notificationCache.filter((notification) => !notification.read_at).length + actionNotifications.length;
  if (els.notificationsBadge) {
    els.notificationsBadge.textContent = unreadCount;
    els.notificationsBadge.classList.toggle("hidden", unreadCount === 0);
  }
  updatePushButton();
  if (!els.notificationList) return;
  els.notificationList.innerHTML = rows.length
    ? rows.map((item) => (item.actionType ? actionNotificationRow(item) : notificationRow(item))).join("")
    : '<p class="empty">No notifications yet.</p>';
}

function actionNotificationRow(item) {
  if (item.actionType === "league_invite") return leagueInviteNotificationRow(item.data);
  return friendRequestNotificationRow(item.data);
}

function notificationRow(notification) {
  const league = leagueCache.find((item) => item.id === notification.league_id);
  const image = cleanText(notification.image_url);
  return `
    <article class="notification-row ${notification.read_at ? "" : "unread"} ${image ? "has-image" : ""}" data-notification-target="${escapeHtml(notification.link_target || "notifications")}">
      ${image ? `<img class="notification-badge-image" src="${escapeHtml(image)}" alt="" />` : ""}
      <div>
        <strong>${escapeHtml(notification.title)}</strong>
        <span>${escapeHtml(notification.message)}</span>
        <small>${escapeHtml(league?.name || notification.typeLabel || notificationTypeLabel(notification.type))} - ${formatDate(notification.created_at)}</small>
      </div>
    </article>
  `;
}

function notificationTypeLabel(type) {
  return {
    achievement: "Achievement",
    friend_request: "Friend Request",
    league_invite: "League Invite",
    ranking: "Ranking Update",
  }[type] || "Notification";
}

function pendingIncomingFriendRequests() {
  const email = currentUser?.email?.toLowerCase();
  return friendRequestCache.filter(
    (request) => request.status === "pending" && request.requester_id !== currentUser?.id && request.recipient_email?.toLowerCase() === email,
  );
}

function pendingLeagueInvites() {
  const email = currentUser?.email?.toLowerCase();
  return leagueMemberCache.filter((member) => member.email?.toLowerCase() === email && !member.user_id);
}

function acceptedFriends() {
  return friendRequestCache.filter(
    (request) =>
      request.status === "accepted" &&
      (request.requester_id === currentUser?.id || request.recipient_id === currentUser?.id || request.recipient_email?.toLowerCase() === currentUser?.email?.toLowerCase()),
  );
}

function leagueInviteRow(member) {
  const league = leagueCache.find((item) => item.id === member.league_id);
  return `
    <article class="friend-row">
      <div>
        <strong>${escapeHtml(league?.name || "League Invite")}</strong>
        <span>${escapeHtml(league?.description || "You were invited by email.")}</span>
      </div>
      <div class="friend-actions">
        <button class="text-button" type="button" data-league-invite-accept="${member.id}">Accept</button>
        <button class="text-button danger-text" type="button" data-league-invite-deny="${member.id}">Deny</button>
      </div>
    </article>
  `;
}

function leagueInviteNotificationRow(member) {
  const league = leagueCache.find((item) => item.id === member.league_id);
  return `
    <article class="notification-row unread">
      <div>
        <strong>League invite</strong>
        <span>${escapeHtml(league?.name || "You were invited to a league.")}</span>
        <small>${formatDate(member.created_at)}</small>
      </div>
      <div class="friend-actions">
        <button class="text-button" type="button" data-league-invite-accept="${member.id}">Accept</button>
        <button class="text-button danger-text" type="button" data-league-invite-deny="${member.id}">Deny</button>
      </div>
    </article>
  `;
}

function friendRequestRow(request) {
  return `
    <article class="friend-row">
      <div>
        <strong>${escapeHtml(request.requester_name || profileNameFromEmail(request.requester_email))}</strong>
        <span>${escapeHtml(request.requester_email)}</span>
      </div>
      <div class="friend-actions">
        <button class="text-button" type="button" data-friend-accept="${request.id}">Accept</button>
        <button class="text-button danger-text" type="button" data-friend-deny="${request.id}">Deny</button>
      </div>
    </article>
  `;
}

function friendRequestNotificationRow(request) {
  return `
    <article class="notification-row unread">
      <div>
        <strong>Friend request</strong>
        <span>${escapeHtml(request.requester_name || profileNameFromEmail(request.requester_email))} wants to add you.</span>
        <small>${formatDate(request.created_at)}</small>
      </div>
      <div class="friend-actions">
        <button class="text-button" type="button" data-friend-accept="${request.id}">Accept</button>
        <button class="text-button danger-text" type="button" data-friend-deny="${request.id}">Deny</button>
      </div>
    </article>
  `;
}

function friendRow(request) {
  const friend = friendInfo(request);
  const stats = localStatsForPlayer(friend.name);
  const selected = selectedFriendRequestId === request.id;
  const confirming = confirmingUnfriendRequestId === request.id;
  return `
    <button class="friend-row friend-card ${selected ? "selected" : ""}" type="button" data-friend-card="${request.id}">
      <div>
        <strong>${escapeHtml(friend.name)}</strong>
        <span>Tap for stats</span>
      </div>
      ${
        selected
          ? `
            <div class="profile-stat-grid">
              <div><b>${stats.games}</b><span>Games</span></div>
              <div><b>${stats.wins}-${stats.losses}</b><span>Record</span></div>
              <div><b>${formatPercent(winPercent(stats))}</b><span>Win %</span></div>
              <div><b>${stats.sinks}</b><span>Sinks</span></div>
              <div><b>${stats.tinks}</b><span>Tinks</span></div>
              <div><b>${stats.fifas}</b><span>FIFAs</span></div>
            </div>
            ${
              confirming
                ? `<div class="friend-actions"><button class="text-button danger-text" type="button" data-unfriend-confirm="${request.id}">Yes</button><button class="text-button" type="button" data-unfriend-cancel="${request.id}">Cancel</button></div>`
                : `<div class="friend-actions"><button class="text-button" type="button" data-invite-friend-league="${request.id}">Invite to League</button><button class="text-button danger-text" type="button" data-unfriend="${request.id}">Unfriend</button></div>`
            }
          `
          : ""
      }
    </button>
  `;
}

function localStatsForPlayer(playerName) {
  return computePlayerStats()[profileKey(playerName)]?.overall || emptyBucket();
}

function friendInfo(request) {
  const isSender = request.requester_id === currentUser?.id;
  return {
    name: isSender ? request.recipient_name || profileNameFromEmail(request.recipient_email) : request.requester_name || profileNameFromEmail(request.requester_email),
    email: isSender ? request.recipient_email : request.requester_email,
  };
}

function leagueCard(league) {
  const members = leagueMembers(league.id);
  const role = members.find((member) => member.user_id === currentUser?.id || member.email === currentUser?.email)?.role || "";
  return `
    <button class="league-card-button" type="button" data-open-league="${league.id}">
      ${cubeBadge(league)}
      <span>
        <strong>${escapeHtml(league.name)}</strong>
        <small>${escapeHtml(league.description || "No description")} </small>
        <em>${league.privacy === "invite" ? "Invite Only" : "Open"} - ${members.length}/50${role ? ` - ${displayRole(role)}` : ""}</em>
      </span>
    </button>
  `;
}

function renderLeagueDetails() {
  const league = activeLeague();
  if (!league) return;
  const members = leagueMembers();
  const member = myLeagueMember();
  const role = member?.role || "";
  const canManage = canManageActiveLeague();
  const canLog = canLogActiveLeagueGames();
  const canInvite = canInviteActiveLeague();
  const isOwner = isActiveLeagueOwner();

  els.leagueDetailTabs.forEach((tab) => {
    const tabName = tab.dataset.leagueDetailTab;
    const managerOnly = false;
    const loggerOnly = false;
    const inviteOnly = tabName === "invite";
    tab.classList.toggle("active", tabName === leagueDetailTab);
    tab.disabled = (managerOnly && !canManage) || (loggerOnly && !canLog) || (inviteOnly && !canInvite);
  });
  els.leagueDetailPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `league${capitalize(leagueDetailTab)}Panel`);
  });

  els.leagueDetailHero.innerHTML = `
    <div class="league-head">
      ${cubeBadge(league)}
      <div>
        <h2>${escapeHtml(league.name)}</h2>
        <p>${escapeHtml(league.description || "No description yet.")}</p>
        <div class="meta-line">${members.length}/50 members - ${league.privacy === "invite" ? "Invite Only" : "Open"}${role ? ` - Your role: ${displayRole(role)}` : ""}</div>
      </div>
    </div>
  `;

  renderLeagueGames();
  renderLeagueTournaments();
  renderLeagueStats();
  renderLeagueStatsTable();
  renderLeagueRankings();
  renderLeagueSettings();
  renderLeagueMembers();
  renderLeagueInviteTools();
}

function renderLeagueGames() {
  const canLog = canLogActiveLeagueGames();
  els.leagueGameForm.classList.toggle("hidden", !canLog);
  buildLeagueGamePlayerCards();
  const games = leagueGames();
  els.leagueQuickRematchBtn.disabled = !games.length;
  els.leagueGameHistory.innerHTML = games.length
    ? games.map((game) => gameCard(game)).join("")
    : '<p class="empty">No league games logged yet.</p>';
  const editingGame = editingLeagueGameId ? games.find((game) => game.id === editingLeagueGameId) : null;
  if (editingGame && canLog) {
    populateLeagueGameForm(editingGame);
  } else if (editingLeagueGameId) {
    resetLeagueGameForm();
  }
}

function renderLeagueTournaments() {
  const tournaments = leagueTournaments();
  const canLog = canLogActiveLeagueGames();
  const canManage = canManageActiveLeague();
  els.leagueTournamentForm.classList.toggle("hidden", !canLog);
  els.deleteLeagueTournamentBtn.hidden = !canManage || !tournaments.length;

  if (!tournaments.length) {
    activeLeagueTournamentId = "";
    els.leagueTournamentSelect.innerHTML = '<option value="">No league tournaments yet</option>';
    els.leagueTournamentSummary.innerHTML = "";
    els.leagueTournamentBracket.innerHTML = '<p class="empty">Create a league tournament to see the bracket.</p>';
    els.leagueTournamentMatchesList.innerHTML = '<p class="empty">No league tournament matches logged yet.</p>';
    return;
  }

  const tournament = activeLeagueTournament();
  ensureActiveTournamentMatch(tournament);
  els.leagueTournamentSelect.innerHTML = tournaments
    .map((item) => `<option value="${item.id}" ${item.id === tournament.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");

  const champion = tournament.rounds.at(-1).matches[0]?.winner;
  const completedMatches = tournament.rounds.flatMap((round) => round.matches).filter((match) => match.game).length;
  els.leagueTournamentSummary.innerHTML = `
    <div class="summary-item"><b>${tournament.teams.length}</b><span>Teams</span></div>
    <div class="summary-item"><b>${completedMatches}</b><span>Matches</span></div>
    <div class="summary-item"><b>${escapeHtml(champion?.name || "Open")}</b><span>Champion</span></div>
  `;

  const readyMatches = readyTournamentMatches(tournament);
  const match = selectedTournamentMatch(tournament);
  if (!readyMatches.length || !match) {
    els.leagueTournamentBracket.innerHTML = '<p class="empty">Waiting for the next matchup.</p>';
  } else {
    els.leagueTournamentBracket.innerHTML = `
      <section class="tournament-match-picker">
        <label>
          Matchup
          <select data-league-tournament-match-select>
            ${readyMatches.map((item) => tournamentMatchOption(tournament, item, match.id)).join("")}
          </select>
        </label>
      </section>
      ${leagueTournamentMatchCard(tournament, match, canLog)}
    `;
  }

  const games = tournament.rounds.flatMap((round) => round.matches.map((item) => item.game).filter(Boolean));
  els.leagueTournamentMatchesList.innerHTML = games.length
    ? games
        .slice()
        .reverse()
        .map((game) => gameCard(game))
        .join("")
    : '<p class="empty">No league tournament matches logged yet.</p>';
}

function leagueTournamentMatchCard(tournament, match, canLog) {
  const canLogMatch = canLog && match.teamA && match.teamB && !match.game;
  const pending = !match.teamA || !match.teamB;
  const teamsHtml = [match.teamA, match.teamB]
    .map((team) => {
      const isWinner = match.winner?.id === team?.id;
      return `<div class="team-line ${isWinner ? "winner" : ""}">
        <span>${escapeHtml(team?.name || "TBD")}</span>
        <span>${match.game ? match.game.teams[team?.id === match.teamA?.id ? 0 : 1].score : ""}</span>
      </div>`;
    })
    .join("");

  return `
    <article class="match-card ${pending ? "pending" : ""}">
      <strong>${escapeHtml(tournamentMatchLabel(tournament, match))}</strong>
      ${teamsHtml}
      ${match.game ? `<div class="meta-line">Logged ${formatDate(match.game.createdAt)}</div>` : ""}
      ${canLogMatch ? leagueTournamentMatchForm(tournament, match) : ""}
    </article>
  `;
}

function leagueTournamentMatchForm(tournament, match) {
  return tournamentMatchForm(match)
    .replace('class="match-form tournament-big-form"', `class="match-form tournament-big-form league-tournament-match-form" data-tournament-id="${tournament.id}"`)
    .replace("Log Tournament Game", "Log League Tournament Game");
}

function renderLeagueGameDetail() {
  if (!activeLeagueGameDetailId) {
    els.leagueGameDetail.innerHTML = '<p class="empty">Choose a league game to view.</p>';
    return;
  }

  const game = leagueGames().find((item) => item.id === activeLeagueGameDetailId);
  if (!game) {
    els.leagueGameDetail.innerHTML = '<p class="empty">That game is no longer available.</p>';
    return;
  }

  const winner = game.teams[game.winnerIndex];
  const editButton = canLogActiveLeagueGames()
    ? `<button class="primary-button compact-action-button" type="button" data-detail-edit-league-game="${game.id}">Edit Game</button>`
    : "";
  const selfSinkNote = game.selfSinkPlayer
    ? `<div class="meta-line self-sink-note">${escapeHtml(game.selfSinkPlayer)} self sank. ${escapeHtml(winner.name)} wins.</div>`
    : "";

  els.leagueGameDetail.innerHTML = `
    <div class="section-head match-detail-head">
      <div>
        <h2>${escapeHtml(game.teams[0].name)} vs ${escapeHtml(game.teams[1].name)}</h2>
        <p>${formatDate(game.createdAt || game.created_at)}</p>
      </div>
      ${editButton}
    </div>
    <div class="summary-grid">
      <div class="summary-item"><b>${game.teams[0].score}</b><span>${escapeHtml(game.teams[0].name)}</span></div>
      <div class="summary-item"><b>${game.teams[1].score}</b><span>${escapeHtml(game.teams[1].name)}</span></div>
      <div class="summary-item"><b>${escapeHtml(winner.name)}</b><span>Winner</span></div>
    </div>
    ${selfSinkNote}
    <div class="match-detail-grid">
      ${game.teams.map((team, index) => leagueGameTeamDetail(team, index)).join("")}
    </div>
  `;
}

function leagueGameTeamDetail(team, index) {
  return `
    <section class="match-detail-team">
      <h3>Team ${index + 1}</h3>
      <div class="meta-line">${escapeHtml(team.name)} - ${team.score} points</div>
      ${team.players.map((player) => leagueGamePlayerDetail(player, team.playerStats?.[player] || gamePlayerStatsFallback(player))).join("")}
    </section>
  `;
}

function leagueGamePlayerDetail(player, stats) {
  return `
    <article class="match-detail-player">
      <strong>${escapeHtml(player)}</strong>
      <div class="match-stat-grid">
        ${leagueGameDetailStatFields
          .map(([key, label]) => `<span><b>${stats[key] || 0}</b><small>${label}</small></span>`)
          .join("")}
      </div>
    </article>
  `;
}

function gamePlayerStatsFallback(player) {
  const game = leagueGames().find((item) => item.id === activeLeagueGameDetailId);
  return game?.playerStats?.[player] || emptyLeagueStats();
}

function renderLeagueStats() {
  const stats = computeLeagueStats();
  const players = leagueMembers()
    .map((member) => ({ ...member, stats: stats.players[member.display_name.toLowerCase()] || emptyBucket() }))
    .sort((a, b) => b.stats.wins - a.stats.wins || winPercent(b.stats) - winPercent(a.stats) || b.stats.sinks - a.stats.sinks);

  els.leaguePlayerStats.innerHTML = players.length
    ? players.map(leagueRosterCard).join("")
    : '<p class="empty">No league members yet.</p>';
  renderLeagueCompare(players);
  renderLeagueRosterDetail(players);
}

function renderLeagueStatsTable() {
  const stats = computeLeagueStats();
  const players = Object.values(stats.players).sort((a, b) => b.wins - a.wins || winPercent(b) - winPercent(a) || b.sinks - a.sinks);
  els.leagueStatsTable.innerHTML = players.length
    ? players.map(leaguePlayerStatsRow).join("")
    : '<tr><td colspan="12">No league games logged yet.</td></tr>';
}

function renderLeagueRankings() {
  const stats = computeLeagueStats();
  const players = Object.values(stats.players);
  const teams = Object.values(stats.teams);
  const byOverall = [...players].sort((a, b) => b.wins - a.wins || b.sinks - a.sinks);
  const byWinPercent = [...players].filter((player) => player.games).sort((a, b) => winPercent(b) - winPercent(a) || b.wins - a.wins);
  const bySinks = [...players].sort((a, b) => b.sinks - a.sinks);
  const byTeams = [...teams].sort((a, b) => b.wins - a.wins || winPercent(b) - winPercent(a));

  els.leagueOverallRankings.innerHTML = rankingCards(byOverall, (player) => `${player.wins}-${player.losses} - ${player.sinks} sinks`);
  els.leaguePlayerRankings.innerHTML = rankingCards(byOverall, (player) => `${player.games} games - ${formatPercent(winPercent(player))}`);
  els.leagueTeamRankings.innerHTML = rankingCards(byTeams, (team) => `${team.wins}-${team.losses} - ${team.totalPoints} pts`);
  els.leagueWinRankings.innerHTML = rankingCards(byWinPercent, (player) => `${formatPercent(winPercent(player))} - ${player.wins}-${player.losses}`);
  els.leagueSinkRankings.innerHTML = rankingCards(bySinks, (player) => `${player.sinks} sinks`);
}

function renderLeagueSettings() {
  const league = activeLeague();
  const canManage = canManageActiveLeague();
  const isOwner = isActiveLeagueOwner();
  const member = myLeagueMember();
  els.leagueSettingsForm.classList.toggle("hidden", !member);
  els.leagueSettingsForm.querySelectorAll(".manager-setting").forEach((item) => item.classList.toggle("hidden", !canManage));
  els.leaveLeagueBtn.hidden = isOwner || !member || confirmingLeaveLeague;
  els.leaveLeagueConfirm.classList.toggle("hidden", isOwner || !member || !confirmingLeaveLeague);
  els.deleteLeagueBtn.hidden = !isOwner;
  if (!league || !canManage) return;
  els.leagueSettingsForm.elements.name.value = league.name;
  els.leagueSettingsForm.elements.description.value = league.description || "";
  els.leagueSettingsForm.elements.privacy.value = league.privacy;
  els.leagueSettingsForm.elements.logoTop.value = league.logo_top || "#EFBF04";
  els.leagueSettingsForm.elements.logoLeft.value = league.logo_left || "#ffffff";
  els.leagueSettingsForm.elements.logoRight.value = league.logo_right || "#4f7fc8";
}

function renderLeagueMembers() {
  const canManage = canManageActiveLeague();
  const canInvite = canInviteActiveLeague();
  const isOwner = isActiveLeagueOwner();
  els.leagueInviteForm.classList.toggle("hidden", !canInvite);
  const stats = computeLeagueStats();
  els.leagueMemberList.innerHTML = leagueMembers()
    .map((member) => ({ ...member, stats: stats.players[member.display_name.toLowerCase()] || emptyBucket() }))
    .sort((a, b) => b.stats.wins - a.stats.wins || winPercent(b.stats) - winPercent(a.stats) || b.stats.sinks - a.stats.sinks)
    .map((member) => leagueMemberRow(member, canManage, isOwner))
    .join("");
}

function renderLeagueInviteTools() {
  const league = activeLeague();
  if (!league || !canInviteActiveLeague()) return;
  const link = leagueInviteLink(league.id);
  els.leagueInviteLink.value = link;
  els.toggleLeagueQrBtn.textContent = showingLeagueQr ? "Hide QR Code" : "Show QR Code";
  els.leagueQrBox.classList.toggle("hidden", !showingLeagueQr);
  els.leagueQrBox.innerHTML = showingLeagueQr
    ? `<img src="${qrCodeUrl(link)}" alt="QR code for ${escapeHtml(league.name)} invite" /><span>Scan to join ${escapeHtml(league.name)}</span>`
    : "";
}

function leagueInviteLink(leagueId) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("leagueInvite", leagueId);
  return url.toString();
}

function qrCodeUrl(value) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(value)}`;
}

async function copyLeagueInviteLink() {
  const link = els.leagueInviteLink.value || leagueInviteLink(activeLeagueId);
  try {
    await navigator.clipboard.writeText(link);
    els.copyLeagueInviteBtn.textContent = "Copied";
    window.setTimeout(() => {
      els.copyLeagueInviteBtn.textContent = "Copy";
    }, 1400);
  } catch {
    els.leagueInviteLink.select();
    document.execCommand("copy");
  }
}

function cubeBadge(league = {}) {
  return `
    <span class="die-badge-shell">
      ${diceLogo({
        topColor: league.logo_top || "#EFBF04",
        leftColor: league.logo_left || "#ffffff",
        rightColor: league.logo_right || "#4f7fc8",
      })}
    </span>
  `;
}

function diceLogo({
  topColor = "#EFBF04",
  leftColor = "#ffffff",
  rightColor = "#4f7fc8",
  outlineColor = "rgba(3, 9, 21, 0.96)",
  size = 128,
} = {}) {
  return `
    <svg class="league-cube" width="${escapeHtml(size)}" height="${escapeHtml(size)}" viewBox="0 0 128 128" aria-hidden="true" style="--outline-color:${escapeHtml(outlineColor)}">
      <g class="league-cube-faces">
        <g class="topFace">
          <path class="league-cube-fill league-cube-top" fill="${escapeHtml(topColor)}" d="M64 12 112 36 64 60 16 36Z"></path>
          <path class="league-cube-shade league-cube-top-shade" d="M64 12 112 36 64 60 16 36Z"></path>
        </g>
        <g class="leftFace">
          <path class="league-cube-fill league-cube-left" fill="${escapeHtml(leftColor)}" d="M16 36 64 60v56L16 92Z"></path>
          <path class="league-cube-shade league-cube-left-shade" d="M16 36 64 60v56L16 92Z"></path>
        </g>
        <g class="rightFace">
          <path class="league-cube-fill league-cube-right" fill="${escapeHtml(rightColor)}" d="M112 36 64 60v56l48-24Z"></path>
          <path class="league-cube-shade league-cube-right-shade" d="M112 36 64 60v56l48-24Z"></path>
        </g>
        <path class="league-cube-edge" d="M64 12 112 36v56l-48 24-48-24V36Z"></path>
        <path class="league-cube-seam" d="M16 36 64 60 112 36M64 60v56"></path>
      </g>
      <path class="league-cube-highlight" d="M27 36 64 18 101 36"></path>
    </svg>
  `;
}

function profileCupBadge(profile = {}) {
  return `
    <span class="profile-cup-badge" style="--cup-color:${escapeHtml(profile.cupColor || "#d71920")}">
      ${cupSvg()}
    </span>
  `;
}

function cupSvg() {
  return '<img class="cup-vector" src="assets/red-solo.svg" alt="" />';
}

function leagueMemberRow(member, canManage, isOwner) {
  const canPromote = canManage && ["member", "ref"].includes(member.role);
  const canMakeRef = canManage && member.role === "member";
  const canDemote = canManage && ["co_leader", "ref"].includes(member.role);
  const canTransfer = isOwner && member.role === "co_leader" && member.user_id;
  const canRemove = canManage && member.role !== "owner";
  return `
    <article class="league-member-row">
      <div>
        <strong>${escapeHtml(member.display_name)}</strong>
        <span>${member.nickname ? `${escapeHtml(member.nickname)} - ` : ""}${displayRole(member.role)} - ${member.stats?.wins || 0}-${member.stats?.losses || 0}</span>
      </div>
      <div class="member-actions">
        ${canPromote ? `<button class="text-button" type="button" data-league-promote="${member.id}">Promote</button>` : ""}
        ${canMakeRef ? `<button class="text-button" type="button" data-league-ref="${member.id}">Make Ref</button>` : ""}
        ${canDemote ? `<button class="text-button" type="button" data-league-demote="${member.id}">Demote</button>` : ""}
        ${canTransfer ? `<button class="text-button" type="button" data-league-transfer="${member.id}">Transfer</button>` : ""}
        ${canRemove ? `<button class="text-button danger-text" type="button" data-league-remove="${member.id}">Kick</button>` : ""}
      </div>
    </article>
  `;
}

function leagueRosterCard(member) {
  const stats = member.stats || emptyBucket();
  const isSelected = member.id === selectedLeagueRosterMemberId;
  return `
    <article class="league-roster-item">
      <button class="league-roster-card ${isSelected ? "selected" : ""}" type="button" data-roster-member="${escapeHtml(member.id)}">
        <div class="league-roster-player">
          <span class="roster-cup-badge" style="--cup-color:${escapeHtml(member.cup_color || "#d71920")}">${cupSvg()}</span>
          <div>
            <strong>${escapeHtml(member.nickname || member.display_name)}</strong>
            <span>${member.nickname ? escapeHtml(member.display_name) : "No nickname"} - ${displayRole(member.role)}</span>
          </div>
        </div>
        <div class="league-roster-stats">
          <div><b>${stats.wins}-${stats.losses}</b><span>Record</span></div>
          <div><b>${formatPercent(winPercent(stats))}</b><span>Win %</span></div>
          <div><b>${stats.sinks}</b><span>Sinks</span></div>
          <div><b>${escapeHtml(streakLabel(stats))}</b><span>Streak</span></div>
        </div>
      </button>
      ${isSelected ? leagueRosterDetailCard(member) : ""}
    </article>
  `;
}

function renderLeagueCompare(players = []) {
  if (!players.length) {
    els.leagueCompareForm.classList.add("hidden");
    els.leagueCompareResult.innerHTML = "";
    return;
  }

  els.leagueCompareForm.classList.toggle("hidden", players.length < 2);
  if (players.length < 2) {
    els.leagueCompareResult.innerHTML = '<p class="empty">Add one more league member to compare stats.</p>';
    return;
  }

  const [playerASelect, playerBSelect] = [els.leagueCompareForm.elements.playerA, els.leagueCompareForm.elements.playerB];
  const currentA = playerASelect.value || players[0]?.id || "";
  const currentB = playerBSelect.value || players.find((player) => player.id !== currentA)?.id || players[1]?.id || "";
  const options = players.map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.nickname || player.display_name)}</option>`).join("");
  playerASelect.innerHTML = options;
  playerBSelect.innerHTML = options;
  playerASelect.value = players.some((player) => player.id === currentA) ? currentA : players[0].id;
  playerBSelect.value = players.some((player) => player.id === currentB && player.id !== playerASelect.value)
    ? currentB
    : players.find((player) => player.id !== playerASelect.value)?.id || players[1].id;

  const playerA = players.find((player) => player.id === playerASelect.value);
  const playerB = players.find((player) => player.id === playerBSelect.value);
  if (!playerA || !playerB) {
    els.leagueCompareResult.innerHTML = "";
    return;
  }

  els.leagueCompareResult.innerHTML = `
    <div class="compare-grid">
      ${leagueCompareCard(playerA)}
      ${leagueCompareCard(playerB)}
    </div>
  `;
}

function leagueCompareCard(player) {
  const stats = player.stats || emptyBucket();
  const rows = [
    ["Record", `${stats.wins}-${stats.losses}`],
    ["Win %", formatPercent(winPercent(stats))],
    ["Current Streak", streakLabel(stats)],
    ["Table Hits", stats.tableHits],
    ["Sinks", stats.sinks],
    ["Tinks", stats.tinks],
    ["FG Off.", stats.fgOffense],
    ["FG Def.", stats.fgDefense],
    ["FIFAs", stats.fifas],
  ];
  return `
    <article class="compare-card">
      <strong>${escapeHtml(player.nickname || player.display_name)}</strong>
      ${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("")}
    </article>
  `;
}

function renderLeagueRosterDetail(players) {
  if (!players.length) {
    selectedLeagueRosterMemberId = "";
    els.leagueRosterDetail.innerHTML = "";
    return;
  }

  const selected = players.find((player) => player.id === selectedLeagueRosterMemberId);
  if (!selected) {
    els.leagueRosterDetail.innerHTML = "";
    return;
  }

  els.leagueRosterDetail.innerHTML = "";
}

function leagueRosterDetailCard(selected) {
  const stats = selected.stats || emptyBucket();
  const achievementsOpen = selectedLeagueAchievementsMemberId === selected.id;
  const statItems = [
    ["Games", stats.games],
    ["Record", `${stats.wins}-${stats.losses}`],
    ["Win %", formatPercent(winPercent(stats))],
    ["Current Streak", streakLabel(stats)],
    ["Table Hits", stats.tableHits],
    ["Sinks", stats.sinks],
    ["Tinks", stats.tinks],
    ["FG Offense", stats.fgOffense],
    ["FG Defense", stats.fgDefense],
    ["FIFAs", stats.fifas],
    ["Self Sinks", stats.selfSinks],
  ];

  return `
    <article class="league-player-detail-card">
      <div class="league-roster-player">
        <span class="roster-cup-badge" style="--cup-color:${escapeHtml(selected.cup_color || "#d71920")}">${cupSvg()}</span>
        <div>
          <strong>${escapeHtml(selected.nickname || selected.display_name)}</strong>
          <span>${displayRole(selected.role)}</span>
        </div>
      </div>
      <div class="profile-stat-grid">
        ${statItems.map(([label, value]) => `<div><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`).join("")}
      </div>
      <div class="roster-detail-actions">
        <button class="small-button secondary-button" type="button" data-roster-achievements="${escapeHtml(selected.id)}">
          ${achievementsOpen ? "Hide League Badges" : "See League Badges"}
        </button>
        <button class="small-button secondary-button" type="button" data-add-friend="${escapeHtml(selected.id)}">Add Friend</button>
      </div>
      ${achievementsOpen ? leagueBadgeSection(stats) : ""}
    </article>
  `;
}

function computeLeagueStats() {
  const players = {};
  const teams = {};
  leagueStatGames().forEach((game) => {
    game.teams.forEach((team, teamIndex) => {
      const won = game.winnerIndex === teamIndex;
      const teamKey = team.players.join(" / ").toLowerCase();
      if (!teams[teamKey]) {
        teams[teamKey] = { name: team.players.join(" / "), wins: 0, losses: 0, totalPoints: 0, games: 0 };
      }
      teams[teamKey].games += 1;
      teams[teamKey].wins += won ? 1 : 0;
      teams[teamKey].losses += won ? 0 : 1;
      teams[teamKey].totalPoints += team.score || 0;

      team.players.forEach((playerName) => {
        const key = playerName.toLowerCase();
        if (!players[key]) players[key] = { name: playerName, ...emptyBucket() };
        addGameToBucket(players[key], team.playerStats?.[playerName] || emptyLeagueStats(), won);
        if (game.source === "league_tournament") {
          players[key].tournamentWins += won ? 1 : 0;
          players[key].tournamentLosses += won ? 0 : 1;
        }
      });
    });
  });
  Object.values(players).forEach((player) => {
    player.streak = currentLeagueStreak(player.name);
  });
  return { players, teams };
}

function currentLeagueStreak(playerName) {
  const target = cleanText(playerName).toLowerCase();
  let streakType = "";
  let count = 0;

  for (const game of leagueStatGames()) {
    const teamIndex = game.teams.findIndex((team) => team.players.some((player) => player.toLowerCase() === target));
    if (teamIndex === -1) continue;
    const result = game.winnerIndex === teamIndex ? "W" : "L";
    if (!streakType) streakType = result;
    if (result !== streakType) break;
    count += 1;
  }

  return count ? { type: streakType, count, label: `${streakType}${count}` } : { type: "", count: 0, label: "-" };
}

function streakLabel(stats = {}) {
  return stats.streak?.label || "-";
}

function leaguePlayerStatsRow(player) {
  return `
    <tr>
      <td>${escapeHtml(player.name)}</td>
      <td>${player.wins}-${player.losses}</td>
      <td>${formatPercent(winPercent(player))}</td>
      <td>${escapeHtml(streakLabel(player))}</td>
      <td>${player.tableHits}</td>
      <td>${player.sinks}</td>
      <td>${player.tinks}</td>
      <td>${player.fgOffense}</td>
      <td>${player.fgDefense}</td>
      <td>${player.fifas}</td>
      <td>${player.selfSinks}</td>
      <td>${player.tournamentWins || 0}-${player.tournamentLosses || 0}</td>
    </tr>
  `;
}

function rankingCards(items, detailFn) {
  return items.length
    ? items
        .slice(0, 10)
        .map(
          (item, index) => `
            <article class="stat-card">
              <strong>${index + 1}. ${escapeHtml(item.name)}</strong>
              <span>${detailFn(item)}</span>
            </article>
          `,
        )
        .join("")
    : '<p class="empty">No rankings yet.</p>';
}

function winPercent(item) {
  return item.games ? item.wins / item.games : 0;
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function renderStats() {
  const allStats = computePlayerStats();
  const players = Object.values(allStats).sort((a, b) => b.overall.wins - a.overall.wins || b.overall.sinks - a.overall.sinks);

  els.overallLeaders.innerHTML = players.length
    ? players.slice(0, 5).map((player) => statCard(player, "overall")).join("")
    : '<p class="empty">No player stats yet.</p>';

  const tournament = activeTournament();
  const tournamentPlayers = Object.values(computePlayerStats(tournament?.id)).sort(
    (a, b) => b.tournament.wins - a.tournament.wins || b.tournament.sinks - a.tournament.sinks,
  );

  els.tournamentStats.innerHTML = tournamentPlayers.length
    ? tournamentPlayers.map((player) => statCard(player, "tournament")).join("")
    : '<p class="empty">No tournament stats yet.</p>';

  els.playerStatsTable.innerHTML = players.length
    ? players.map(playerRow).join("")
    : '<tr><td colspan="12">No games logged yet.</td></tr>';
}

function renderProfiles() {
  const profile = state.myProfile;
  const nickname = myProfileNickname();
  const hasProfile = !!nickname;
  els.profileForm.classList.toggle("hidden", hasProfile && !editingMyProfile);
  els.profileForm.elements.nickname.value = nickname;
  els.profileForm.elements.preferredPartner.value = profile?.preferredPartner || "";
  els.profileForm.elements.cupColor.value = profile?.cupColor || "#d71920";
  els.profileForm.elements.notes.value = profile?.notes || "";

  if (!hasProfile) {
    els.profileList.innerHTML = '<p class="empty">Fill out your profile once to unlock your personal stats.</p>';
    return;
  }

  const personalStats = computePlayerStats()[profileKey(nickname)]?.overall || emptyBucket();
  els.profileList.innerHTML = `
    <article class="profile-card">
      <div class="profile-identity">
        ${profileCupBadge(profile)}
        <div>
          <strong>${escapeHtml(nickname)}</strong>
          <span>Favorite cup</span>
        </div>
      </div>
      ${profile.preferredPartner ? `<p>Preferred partner: ${escapeHtml(profile.preferredPartner)}</p>` : ""}
      ${profile.notes ? `<p>${escapeHtml(profile.notes)}</p>` : ""}
      <button class="small-button secondary-button" type="button" data-edit-profile>Edit Profile</button>
      <div class="profile-stat-grid">
        <div><b>${personalStats.wins}-${personalStats.losses}</b><span>Record</span></div>
        <div><b>${personalStats.sinks}</b><span>Sinks</span></div>
        <div><b>${personalStats.tinks}</b><span>Tinks</span></div>
        <div><b>${personalStats.points}</b><span>Score</span></div>
        <div><b>${personalStats.tableHits}</b><span>Table Hits</span></div>
        <div><b>${personalStats.fgOffense}</b><span>FG Off</span></div>
        <div><b>${personalStats.fgDefense}</b><span>FG Def</span></div>
        <div><b>${personalStats.selfSinks}</b><span>Self Sinks</span></div>
        <div><b>${personalStats.fifas}</b><span>FIFAs</span></div>
      </div>
      ${achievementSection(personalStats, "Achievements")}
    </article>
  `;
}

function achievementSection(stats, title) {
  return `
    <section class="achievement-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="league-badge-grid">
        ${achievementDefinitions.map((definition) => achievementProgressCard(definition, stats)).join("")}
      </div>
    </section>
  `;
}

function leagueBadgeSection(stats) {
  return `
    <section class="achievement-section league-badge-section">
      <h3>League Badges</h3>
      <div class="league-badge-grid">
        ${achievementDefinitions.map((definition) => achievementProgressCard(definition, stats)).join("")}
      </div>
    </section>
  `;
}

function achievementProgressCard(definition, stats) {
  const value = Number(stats?.[definition.key]) || 0;
  const rank = achievementRankValue(value, definition.thresholds);
  const tierIndex = Math.max(0, Math.min(rank - 1, achievementTiers.length - 1));
  const tier = achievementTiers[tierIndex];
  const tierClass = tier.toLowerCase();
  const goalIndex = Math.min(rank, definition.thresholds.length - 1);
  const goal = definition.thresholds[goalIndex];
  const fraction = `${value}/${goal}`;
  const rankName = achievementRankLabel(rank) || `Locked - ${tier}`;
  return `
    <article class="league-badge-card achievement-${rank ? tierClass : "locked"}">
      <div class="league-badge-body">
        <img class="league-badge-single ${rank ? "earned" : "locked"}" src="${achievementBadgeSrc(tierClass)}" alt="${escapeHtml(`${rankName} ${definition.label}`)}" />
        <strong>${escapeHtml(definition.label)}</strong>
        <span>${escapeHtml(rankName)}</span>
      </div>
      <div class="league-badge-footer">
        <div class="league-badge-dots" aria-hidden="true">
          ${achievementTiers.map((item, index) => `<i class="badge-dot badge-dot-${item.toLowerCase()} ${rank >= index + 1 ? "earned" : ""}"></i>`).join("")}
        </div>
        <b>${escapeHtml(fraction)}</b>
      </div>
    </article>
  `;
}

function achievementCard(definition, stats) {
  const value = Number(stats?.[definition.key]) || 0;
  const progress = achievementProgress(value, definition.thresholds);
  const badgeSrc = achievementBadgeSrc(progress.tierClass);
  if (!badgeSrc) return "";
  return `
    <article class="achievement-card achievement-${progress.tierClass}" title="${escapeHtml(`${progress.label} ${definition.label}`)}">
      <img src="${badgeSrc}" alt="${escapeHtml(`${progress.label} ${definition.label}`)}" />
    </article>
  `;
}

function achievementBadgeSrc(tierClass) {
  return {
    copper: "assets/badge-copper.png",
    silver: "assets/badge-silver.png",
    gold: "assets/badge-gold.png",
    diamond: "assets/badge-diamond.png",
  }[tierClass] || "";
}

function achievementProgress(value, thresholds) {
  const diamond = thresholds[3];
  if (value >= diamond) {
    const repeats = Math.floor(value / diamond);
    const next = diamond * (repeats + 1);
    return {
      label: repeats > 1 ? `Diamond x${repeats}` : "Diamond",
      tierClass: "diamond",
      progressText: `${value}/${next} to Diamond x${repeats + 1}`,
    };
  }

  let tierIndex = -1;
  thresholds.forEach((threshold, index) => {
    if (value >= threshold) tierIndex = index;
  });

  const nextIndex = tierIndex + 1;
  return {
    label: tierIndex >= 0 ? achievementTiers[tierIndex] : "Locked",
    tierClass: tierIndex >= 0 ? achievementTiers[tierIndex].toLowerCase() : "locked",
    progressText: `${value}/${thresholds[nextIndex]} to ${achievementTiers[nextIndex]}`,
  };
}

function achievementRankValue(value, thresholds) {
  const diamond = thresholds[3];
  if (value >= diamond) return 4 + Math.floor(value / diamond) - 1;
  let rank = 0;
  thresholds.forEach((threshold, index) => {
    if (value >= threshold) rank = index + 1;
  });
  return rank;
}

function achievementRankLabel(rank) {
  if (rank <= 0) return "";
  if (rank <= 4) return achievementTiers[rank - 1];
  return `Diamond x${rank - 3}`;
}

function achievementRankClass(rank) {
  if (rank <= 0) return "locked";
  if (rank >= 4) return "diamond";
  return achievementTiers[rank - 1].toLowerCase();
}

function leagueAchievementRanks(stats) {
  return Object.fromEntries(
    Object.entries(stats.players).map(([key, player]) => [
      key,
      Object.fromEntries(achievementDefinitions.map((definition) => [definition.key, achievementRankValue(player[definition.key] || 0, definition.thresholds)])),
    ]),
  );
}

async function notifyLeagueAchievementUnlocks(beforeRanks, afterStats) {
  const league = activeLeague();
  if (!league) return;
  const members = leagueMembers();
  const messages = [];
  Object.entries(afterStats.players).forEach(([playerKey, player]) => {
    const member = members.find((item) => cleanText(item.display_name).toLowerCase() === playerKey || cleanText(item.nickname).toLowerCase() === playerKey);
    if (!member?.user_id && !member?.email) return;
    achievementDefinitions.forEach((definition) => {
      const beforeRank = beforeRanks[playerKey]?.[definition.key] || 0;
      const afterRank = achievementRankValue(player[definition.key] || 0, definition.thresholds);
      if (afterRank <= beforeRank || afterRank <= 0) return;
      messages.push({
        recipientId: member.user_id || null,
        recipientEmail: member.email || "",
        leagueId: league.id,
        type: "achievement",
        title: `${achievementRankLabel(afterRank)} ${definition.label}`,
        message: `${member.nickname || member.display_name} unlocked ${achievementRankLabel(afterRank)} ${definition.label} in ${league.name}.`,
        linkTarget: "leagues",
        imageUrl: achievementBadgeSrc(achievementRankClass(afterRank)),
      });
    });
  });
  await Promise.all(messages.map((message) => createNotification(message)));
}

function leagueRankingLeaders(stats) {
  const players = Object.values(stats.players);
  const teams = Object.values(stats.teams);
  const topOf = (items, sorter) => [...items].filter((item) => item.games).sort(sorter)[0]?.name || "";
  return {
    overall: topOf(players, (a, b) => b.wins - a.wins || b.sinks - a.sinks),
    winPercent: topOf(players, (a, b) => winPercent(b) - winPercent(a) || b.wins - a.wins),
    sinks: topOf(players, (a, b) => b.sinks - a.sinks || b.wins - a.wins),
    teams: topOf(teams, (a, b) => b.wins - a.wins || winPercent(b) - winPercent(a)),
  };
}

async function notifyLeagueRankingChanges(beforeLeaders, afterLeaders) {
  const league = activeLeague();
  if (!league) return;
  const labels = {
    overall: "Overall Leaderboard",
    winPercent: "Win Percentage",
    sinks: "Total Sinks",
    teams: "Team Rankings",
  };
  const changes = Object.entries(afterLeaders).filter(([key, leader]) => leader && beforeLeaders[key] && leader !== beforeLeaders[key]);
  await Promise.all(
    changes.map(([key, leader]) =>
      createLeagueNotifications(
        league.id,
        {
          type: "ranking",
          title: `New #1: ${labels[key]}`,
          message: `${leader} took #1 in ${labels[key]} for ${league.name}.`,
          linkTarget: "leagues",
        },
        { excludeCurrentUser: false },
      ),
    ),
  );
}

function renderSettings() {
  updatePushButton();
  const players = collectLocalPlayerNames();
  els.settingsPlayersList.innerHTML = players.length
    ? players
        .map(
          (player) => {
            const protectedProfile = isMyProfileName(player);
            return `
            <article class="settings-player-row">
              <strong>${protectedProfile ? "Me" : escapeHtml(player)}</strong>
              ${
                protectedProfile
                  ? '<span class="meta-line">My Profile</span>'
                  : `<button class="text-button danger-text" type="button" data-delete-player="${escapeHtml(player)}">Delete</button>`
              }
            </article>
          `;
          },
        )
        .join("")
    : '<p class="empty">No players saved yet.</p>';
}

function computePlayerStats(tournamentId = "") {
  const stats = {};
  const games = [
    ...state.regularGames,
    ...state.bigGames,
    ...state.tournaments.flatMap((tournament) =>
      tournament.rounds.flatMap((round) => round.matches.map((match) => match.game).filter(Boolean)),
    ),
  ].filter((game) => !tournamentId || game.tournamentId === tournamentId);

  games.forEach((game) => {
    game.teams.forEach((team, teamIndex) => {
      team.players.forEach((playerName) => {
        const player = getPlayerStats(stats, playerName);
        const bucket = game.source === "tournament" ? player.tournament : player.overall;
        const overallBucket = player.overall;
        const playerStats = team.playerStats?.[playerName] || team.stats;
        addGameToBucket(bucket, playerStats, game.winnerIndex === teamIndex);
        if (game.source === "tournament") addGameToBucket(overallBucket, playerStats, game.winnerIndex === teamIndex);
      });
    });
  });
  Object.values(stats).forEach((player) => {
    player.overall.streak = currentPlayerStreak(player.name, games);
    player.tournament.streak = currentPlayerStreak(player.name, games.filter((game) => game.source === "tournament"));
  });

  return stats;
}

function currentPlayerStreak(playerName, games) {
  const target = cleanText(playerName).toLowerCase();
  let streakType = "";
  let count = 0;
  const newestFirst = [...games].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

  for (const game of newestFirst) {
    const teamIndex = game.teams.findIndex((team) => team.players.some((player) => player.toLowerCase() === target));
    if (teamIndex === -1) continue;
    const result = game.winnerIndex === teamIndex ? "W" : "L";
    if (!streakType) streakType = result;
    if (result !== streakType) break;
    count += 1;
  }

  return count ? { type: streakType, count, label: `${streakType}${count}` } : { type: "", count: 0, label: "-" };
}

function computeBigGameStats() {
  const stats = {};
  state.bigGames.forEach((game) => {
    game.teams.forEach((team, teamIndex) => {
      team.players.forEach((playerName) => {
        const player = getPlayerStats(stats, playerName);
        const playerStats = team.playerStats?.[playerName] || team.stats;
        addGameToBucket(player.overall, playerStats, game.winnerIndex === teamIndex);
      });
    });
  });
  return stats;
}

function getPlayerStats(stats, playerName) {
  const key = playerName.toLowerCase();
  if (!stats[key]) {
    stats[key] = {
      name: playerName,
      overall: emptyBucket(),
      tournament: emptyBucket(),
    };
  }
  return stats[key];
}

function emptyBucket() {
  return {
    wins: 0,
    losses: 0,
    tournamentWins: 0,
    tournamentLosses: 0,
    games: 0,
    ...Object.fromEntries(allStatFields.map(([key]) => [key, 0])),
  };
}

function addGameToBucket(bucket, gameStats, won) {
  bucket.games += 1;
  bucket.wins += won ? 1 : 0;
  bucket.losses += won ? 0 : 1;
  allStatFields.forEach(([key]) => {
    bucket[key] += gameStats[key] || 0;
  });
}

function statCard(player, bucketName) {
  const bucket = player[bucketName];
  return `
    <article class="stat-card">
      <strong>${escapeHtml(player.name)}</strong>
      <b>${bucket.wins}-${bucket.losses}</b>
      <span>${bucket.sinks} sinks - ${bucket.tinks} tinks</span>
    </article>
  `;
}

function bigGameLeaderCard(player) {
  const bucket = player.overall;
  return `
    <article class="stat-card">
      <strong>${escapeHtml(player.name)}</strong>
      <b>${bucket.points}</b>
      <span>${bucket.tableHits} table hits - ${bucket.sinks} sinks - ${bucket.tinks} tinks</span>
    </article>
  `;
}

function playerRow(player) {
  const overall = player.overall;
  const tournament = player.tournament;
  return `
    <tr>
      <td>${escapeHtml(player.name)}</td>
      <td>${overall.wins}-${overall.losses}</td>
      <td>${tournament.wins}-${tournament.losses}</td>
      <td>${escapeHtml(streakLabel(overall))}</td>
      <td>${overall.points}</td>
      <td>${overall.tableHits}</td>
      <td>${overall.sinks}</td>
      <td>${overall.tinks}</td>
      <td>${overall.fgOffense}</td>
      <td>${overall.fgDefense}</td>
      <td>${overall.selfSinks}</td>
      <td>${overall.fifas}</td>
    </tr>
  `;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "beer-die-stats.json";
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
