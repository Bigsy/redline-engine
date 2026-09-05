# Parser adapter

The spike uses parse5's worker-compatible default tree adapter and fragment parser, with
an explicit HTML body context (the omitted parse5 context would be a template). It preserves parser-normalized text, namespaces, attributes,
empty nodes and whitespace. The adapter is internal and absent from package exports.
Fingerprint inspection is iterative; equality verifies full structure after hash matches.
Final projection validation compares DOM tuples, including namespaces, against the original
parsed trees; serialization alone is not sufficient evidence of preservation.

Input and work limits are checked around parsing; node/depth limits are checked immediately
following parsing. parse5 parsing/serialization cannot be interrupted synchronously: a host
worker watchdog remains required. Template content is inspected and compared through its
separate content fragment. Serialization compensates for initial-newline removal in HTML
pre/textarea/listing elements. Repairs that invalidate either projection return
unsupported. See CONTRACT.md for the scope and safety ceiling.
