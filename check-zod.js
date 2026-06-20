import z from "zod/v4";
import * as astroZod from "astro/zod";
console.log("zod/v4 typeof function:", typeof z.function);
const f = z.function();
console.log("z.function() type:", typeof f, "hasReturns:", typeof f.returns);
console.log("astro/zod typeof function:", typeof astroZod.z.function);
const f2 = astroZod.z.function();
console.log("astro z.function() type:", typeof f2, "hasReturns:", typeof f2.returns);
