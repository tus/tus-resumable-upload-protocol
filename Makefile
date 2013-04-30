protocol.html: protocol.md node_modules
	./render.js $^ > $@

node_modules:
	npm install .

.PHONY: node_modules
