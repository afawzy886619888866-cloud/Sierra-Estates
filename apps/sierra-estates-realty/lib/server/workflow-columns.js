 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }

/**
 * Field mapping for the admin automations board.
 *
 * The route's payload and the admin UI both use `desc` / `descAr` / `last`.
 * DESC is a SQL keyword, so the columns are `description` / `description_ar` /
 * `last_run_label`. Translating here keeps the API response byte-identical to
 * the Firestore era while the table keeps ordinary column names.
 */
const TO_COLUMN = {
  desc: 'description',
  descAr: 'descriptionAr',
  last: 'lastRunLabel',
};

const TO_FIELD = {
  description: 'desc',
  descriptionAr: 'descAr',
  lastRunLabel: 'last',
};

function rename(value, map) {
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[_nullishCoalesce(map[key], () => ( key))] = item;
  }
  return out;
}

/** Payload → the shape the record layer writes as columns. */
export function toWorkflowColumns(value) {
  return rename(value, TO_COLUMN);
}

/** Row → the shape the admin UI expects. */
export function toWorkflowRecord(value) {
  return rename(value, TO_FIELD);
}
