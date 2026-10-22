## 0.1.0 2026-10-22

* Seneca 4 support. Seneca 4.0.0 validates with
  [shape](https://github.com/rjrodger/shape), the renamed successor of
  Gubu, and rejects option defaults built with Gubu, so 0.0.9 stops the
  process at startup there (`plugin_gubu_shape`). `defaults` is now a
  function of `{ valid }`, the builders Seneca passes to it: shape on
  Seneca 4.0.0, Gubu on Seneca 3 and 4.0.0-rc5. The options are
  unchanged.
* The gubu package is no longer required. It was never a declared
  dependency, and was available only through Seneca 3's own dependency
  on it.
* Breaking: the entity plugin is `@seneca/entity` 29 or later, which
  replaces `seneca-entity`: the peer dependency `seneca-entity >=25` is
  now `@seneca/entity >=29`.
* Breaking: Seneca 3 support starts at 3.38. The peer range is
  `>=3.38||>=4.0.0-rc5` (was `>=3`).
* The `cosmos` options, which hold the account key, are no longer
  printed to the console when the client is made from `cosmos.endpoint`
  and `cosmos.key`.
* Tests: the entity plugin is loaded as `@seneca/entity`, and
  seneca-doc, which does not load on Seneca 4, is no longer used. The
  development dependencies are `seneca ^4.0.0-rc5`, `@seneca/entity
  ^29.0.0` and `@seneca/env ^0.6.0`. The tests run against Seneca 4.0.0,
  4.0.0-rc5 and 3.38.


## 1.0.0 2021-09-28

* Update deps.


## 0.9.2 2021-09-27

* Fix Fix paging


## 0.9.1 2021-09-27

* Fix paging


## 0.9.0 2021-09-27

* Paging


## 0.8.2 2021-09-27

* Fix ProjectionExpression names


## 0.8.0 2021-09-27

* Support field$ directive on lists
* Update deps


## 0.0.1 2020-05-01

* Reboot store




