import bootstrap from "./app";

async function main() {
    const app = await bootstrap();
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Server is running in http://localhost:${PORT}/graphql`);
    })
}

main();