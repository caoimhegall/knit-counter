<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#fbf6f1">
    <title>Knit Counter</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-dvh bg-[#fbf6f1] text-stone-800 antialiased">
<main x-data="knitCounter" x-cloak class="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">

    <header class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Knit Counter</h1>
    </header>

    {{-- Project picker --}}
    <section class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2" x-show="state.projects.length">
            <template x-for="p in state.projects" :key="p.id">
                <button type="button" @click="select(p.id)"
                        class="rounded-full border px-4 py-2 text-sm font-medium transition"
                        :class="p.id === state.currentId
                            ? 'border-rose-700 bg-rose-700 text-white'
                            : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'"
                        x-text="p.name"></button>
            </template>
        </div>

        <form @submit.prevent="add()" class="flex gap-2">
            <label for="new-project" class="sr-only">New project name</label>
            <input id="new-project" x-model="newName" type="text" placeholder="New project name"
                   class="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:border-rose-700 focus:outline-none">
            <button type="submit"
                    class="rounded-xl bg-stone-800 px-5 py-3 font-medium text-white hover:bg-stone-700">Add</button>
        </form>
    </section>

    {{-- Empty state --}}
    <p x-show="!current" class="mt-10 text-center text-stone-500">
        Add a project to start counting.
    </p>

    {{-- Current project --}}
    <section x-show="current" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
            <h2 class="truncate text-2xl font-semibold" x-text="current?.name"></h2>
            <div class="flex shrink-0 gap-1 text-sm">
                <button type="button" @click="rename()" class="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-200">Rename</button>
                <button type="button" @click="remove()" class="rounded-lg px-3 py-2 text-rose-700 hover:bg-rose-50">Delete</button>
            </div>
        </div>

        @foreach (['rows' => 'Rows', 'stitches' => 'Stitches'] as $field => $label)
            <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold uppercase tracking-wider text-stone-500">{{ $label }}</h3>
                    <button type="button" @click="reset('{{ $field }}')"
                            class="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100">Reset</button>
                </div>
                <p class="my-2 text-center text-7xl font-semibold tabular-nums"
                   aria-live="polite" x-text="current?.{{ $field }} ?? 0"></p>
                <div class="grid grid-cols-[1fr_2fr] gap-3">
                    <button type="button" @click="bump('{{ $field }}', -1)" aria-label="Minus one {{ strtolower($label) }}"
                            class="h-20 rounded-2xl bg-stone-100 text-4xl font-medium text-stone-700 active:bg-stone-200 select-none">−</button>
                    <button type="button" @click="bump('{{ $field }}', 1)" aria-label="Plus one {{ strtolower($label) }}"
                            class="h-20 rounded-2xl bg-rose-700 text-4xl font-medium text-white active:bg-rose-800 select-none">+</button>
                </div>
            </div>
        @endforeach
    </section>

    <p class="mt-auto pt-6 text-center text-xs text-stone-400">Saved on this device.</p>
</main>
</body>
</html>
