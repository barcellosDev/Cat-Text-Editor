import jsTokens from "js-tokens";

export default {
    parse(text) {
        const tokens = Array.from(jsTokens(text))

        console.log(tokens)
    }
}