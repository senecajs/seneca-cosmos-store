# Changes

## 0.1.0 2026-11-21

* Seneca 4 only: the peer dependencies are `seneca` `^4.0.0` and
  `@seneca/entity` `^29.0.0`. Seneca 3 users stay on
  `@seneca/cosmos-store` 0.0.9.
* Node.js 24 or later (`engines.node` `>=24`).
* Seneca 4.0.0 validates with
  [shape](https://github.com/rjrodger/shape), the renamed successor of
  Gubu, and rejects option defaults built with Gubu, so 0.0.9 stops the
  process at startup there (`plugin_gubu_shape`). `defaults` is now a
  function of `{ valid }`, the builders Seneca passes to it (B1). The
  options are unchanged.
* The gubu package is no longer required. It was never a declared
  dependency, and was available only through Seneca 3's own dependency
  on it.
* Breaking: the entity plugin is `@seneca/entity` 29, which replaces
  `seneca-entity` (the peer was `seneca-entity >=25`).
* Breaking: `@seneca/env` is an optional peer at `^0.6.0` (was
  `>=0.2`); the store reads `$cosmos-*` variables through it when it is
  loaded. The unused peers `@seneca/provider` and `seneca-promisify`
  are removed.
* The `cosmos` options, which hold the account key, are no longer
  printed to the console when the client is made from `cosmos.endpoint`
  and `cosmos.key`.
* The package ships `cosmos-store.js`, `CHANGES.md`, `README.md` and
  `LICENSE`; `files` named a `lib` folder and a doc file that do not
  exist.
* Tests: lab 26 and code 9 are declared; the entity, env and provider
  plugins are loaded by full name; seneca-doc, seneca-joi and
  seneca-promisify are no longer used; `@seneca/store-test` 7 replaces
  `seneca-store-test`. The account endpoint and key can come from
  `SENECA_COSMOS_ENDPOINT` and `SENECA_COSMOS_KEY` as well as from
  `test/local-env.js`, and the tests that need an account skip without
  either. They ran against the Azure Cosmos DB Linux emulator (vNext
  preview, HTTP), not against Azure.

## Earlier versions

Versions up to 0.0.9 are on npm and in the git history. The entries
that this file held before were copied from another store and did not
describe this package.
