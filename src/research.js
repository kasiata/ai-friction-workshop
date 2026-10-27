// RESEARCH DATA COLLECTION — FUTURE PHASE. Nothing here is active and nothing is sent anywhere.
//
// This file defines the seam where a secure research backend could later be attached:
//  - participation is opt-in and separate from using the application
//  - sessions use a random pseudonymous id (see history.createSession), never a name or email
//  - only the event types the participant consented to would be forwarded
//  - withdrawal = delete by session id; export = the same JSON format the participant can already download
//
// Until a backend is deliberately configured by the researchers, `connect()` always refuses.

export const RESEARCH_STATUS = Object.freeze({
  enabled: false,
  reason: 'Remote data collection is not activated in this version. All records stay in this browser.',
});

export const CONSENT_ITEMS = [
  'I have read the participant information.',
  'I agree that my anonymous session log (settings, generated ideas, and my own written reflections) may be sent to the research team.',
  'I understand that taking part is optional, and I can use Beautifully Broken without it.',
  'I understand I can withdraw and ask for my session’s data to be deleted, using my session code.',
];

/** Interface a future backend adapter must implement. */
export const BackendAdapter = {
  /** @param {{endpoint: string, consent: object}} options */
  async connect(/* options */) { throw new Error(RESEARCH_STATUS.reason); },
  async sendEvents(/* sessionId, events */) { throw new Error(RESEARCH_STATUS.reason); },
  async withdraw(/* sessionId */) { throw new Error(RESEARCH_STATUS.reason); },
};
