import { setCssRegistrySingleton } from "@fogo/sessions-sdk-react";
import { SimpleStyleRegistry } from "simplestyle-js";

const StyleRegistry = new SimpleStyleRegistry();
setCssRegistrySingleton(StyleRegistry);

export { StyleRegistry };
