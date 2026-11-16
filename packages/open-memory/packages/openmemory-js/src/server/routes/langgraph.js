import {
    store_node_mem,
    retrieve_node_mems,
    get_graph_ctx,
    create_refl,
    get_lg_cfg,
} from "../../ai/graph";







export function lg(app) {
    app.get("/lgm/config", (_req, res) => {
        res.json(get_lg_cfg());
    });

    app.post("/lgm/store", async (req, res) => {
        try {
            const r = await store_node_mem(req.body );
            res.json(r);
        } catch (e) {
            console.error("[LGM] store error:", e);
            res.status(400).json({
                err: "lgm_store_failed",
                message: (e ).message,
            });
        }
    });

    app.post("/lgm/retrieve", async (req, res) => {
        try {
            const r = await retrieve_node_mems(req.body );
            res.json(r);
        } catch (e) {
            console.error("[LGM] retrieve error:", e);
            res.status(400).json({
                err: "lgm_retrieve_failed",
                message: (e ).message,
            });
        }
    });

    app.post("/lgm/context", async (req, res) => {
        try {
            const r = await get_graph_ctx(req.body );
            res.json(r);
        } catch (e) {
            console.error("[LGM] context error:", e);
            res.status(400).json({
                err: "lgm_context_failed",
                message: (e ).message,
            });
        }
    });

    app.post("/lgm/reflection", async (req, res) => {
        try {
            const r = await create_refl(req.body );
            res.json(r);
        } catch (e) {
            console.error("[LGM] reflection error:", e);
            res.status(400).json({
                err: "lgm_reflection_failed",
                message: (e ).message,
            });
        }
    });
}
