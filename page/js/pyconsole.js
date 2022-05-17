"use strict";

function sleep(s) {
    return new Promise((resolve) => setTimeout(resolve, s));
}

async function startPythonConsole(targetDiv, pyodide) {
    let namespace = pyodide.globals.get("dict")();
    pyodide.runPython(
        `
            import sys
            from pyodide import to_js
            from pyodide.console import PyodideConsole, repr_shorten, BANNER
            import __main__
            BANNER = "Welcome to the Pyodide terminal emulator 🐍\\n" + BANNER
            BANNER += "\\n\\n\\nThis code is not part of Otcopwn, but the default pyodide codebase\\n"
            BANNER += "You will be able to use the extra packages simply by importing them.\\n"
            BANNER += "\\nWARNING: Causing an infinite loop or any irrecoverable issue \\n(eg. using ctypes) will crash the entire framework. If this happens you'll have to reload the page.\\n\\n"
            pyconsole = PyodideConsole(__main__.__dict__)
            import builtins
            async def await_fut(fut):
              res = await fut
              if res is not None:
                builtins._ = res
              return to_js([res], depth=1)
            def clear_console():
              pyconsole.buffer = []
        `,
        namespace
    );
    let repr_shorten = namespace.get("repr_shorten");
    let banner = namespace.get("BANNER");
    let await_fut = namespace.get("await_fut");
    let pyconsole = namespace.get("pyconsole");
    let clear_console = namespace.get("clear_console");
    namespace.destroy();

    let ps1 = ">>> ",
        ps2 = "... ";

    async function lock() {
        let resolve;
        let ready = term.ready;
        term.ready = new Promise((res) => (resolve = res));
        await ready;
        return resolve;
    }

    async function interpreter(command) {
        let unlock = await lock();
        term.pause();
        // multiline should be splitted (useful when pasting)
        for (const c of command.split("\n")) {
            let fut = pyconsole.push(c);
            term.set_prompt(fut.syntax_check === "incomplete" ? ps2 : ps1);
            switch (fut.syntax_check) {
                case "syntax-error":
                    term.error(fut.formatted_error.trimEnd());
                    continue;
                case "incomplete":
                    continue;
                case "complete":
                    break;
                default:
                    throw new Error(`Unexpected type ${ty}`);
            }
            // In JavaScript, await automatically also awaits any results of
            // awaits, so if an async function returns a future, it will await
            // the inner future too. This is not what we want so we
            // temporarily put it into a list to protect it.
            let wrapped = await_fut(fut);
            // complete case, get result / error and print it.
            try {
                let [value] = await wrapped;
                if (value !== undefined) {
                    term.echo(
                        repr_shorten.callKwargs(value, {
                            separator: "\n[[;orange;]<long output truncated>]\n",
                        })
                    );
                }
                if (pyodide.isPyProxy(value)) {
                    value.destroy();
                }
            } catch (e) {
                if (e.constructor.name === "PythonError") {
                    const message = fut.formatted_error || e.message;
                    term.error(message.trimEnd());
                } else {
                    throw e;
                }
            } finally {
                fut.destroy();
                wrapped.destroy();
            }
        }
        term.resume();
        await sleep(10);
        unlock();
    }

    let term = $(targetDiv).terminal(interpreter, {
        greetings: banner,
        prompt: ps1,
        completionEscape: false,
        completion: function(command, callback) {
            callback(pyconsole.complete(command).toJs()[0]);
        },
        keymap: {
            "CTRL+C": async function(event, original) {
                clear_console();
                term.echo_command();
                term.echo("KeyboardInterrupt");
                term.set_command("");
                term.set_prompt(ps1);
            },
        },
    });
    window.term = term;
    pyconsole.stdout_callback = (s) => term.echo(s, { newline: false });
    pyconsole.stderr_callback = (s) => {
        term.error(s.trimEnd());
    };
    term.ready = Promise.resolve();
    pyodide._module.on_fatal = async(e) => {
        term.error(
            "Pyodide has suffered a fatal error. Please report this to the Pyodide maintainers."
        );
        term.error("The cause of the fatal error was:");
        term.error(e);
        term.error("Look in the browser console for more details.");
        await term.ready;
        term.pause();
        await sleep(15);
        term.pause();
    };
}