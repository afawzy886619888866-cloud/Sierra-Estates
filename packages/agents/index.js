// The scribe / curator / matchmaker / closer agents used to be re-exported from
// here as well. Those copies were a stale fork of
// apps/sierra-estates-realty/lib/agents/*, still importing '../server/firebase-admin'
// — a path that resolves to packages/server/, which does not exist — so nothing
// could have imported them. The realty copies are the live ones.
export * from './openclaw';
