
INSTALL_PREFIX="/usr/local/bin"


all: clean install

clean:
	@@rm -rf ${INSTALL_PREFIX}/pulley

install: clean
	@@ln -s ${PWD}/pulley.js ${INSTALL_PREFIX}/pulley
	@@echo "Installation complete"

.PHONY: install clean

