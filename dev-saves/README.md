# Development save fixtures

## `loop9-save.json`

A lightweight Loop 9 starter save for local/manual QA. It starts at the beginning of Loop 9 (`season: 9`, `loopCount: 8`) with previous loop systems unlocked, default combat state reset, and some crafting/test currencies.

Import in the browser console from the app origin:

```js
fetch('dev-saves/loop9-save.json')
  .then(response => response.json())
  .then(save => {
    localStorage.setItem('poeIdleSaveData_v9', JSON.stringify(save));
    location.reload();
  });
```

The app will run the normal `mergeDefaults` path after reload, so omitted runtime fields are filled from `defaultGame`.

## `loop9-supabase.sql`

A Supabase SQL Editor paste-ready upsert for the same Loop 9 save. Replace the placeholder UUID (`00000000-0000-0000-0000-000000000000`) with the target `auth.users.id`, then run the SQL. It writes to `public.cloud_saves(user_id, save_data, updated_at)` and updates the row if it already exists.
