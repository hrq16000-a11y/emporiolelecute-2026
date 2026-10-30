# Architecture rules

- Resolve checkout postal addresses through `src/lib/postal-address.ts`; centralizing provider fallback keeps automatic and manual CEP input consistent.