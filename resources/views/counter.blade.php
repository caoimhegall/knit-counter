<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#f8f5fb">
    <title>Knit Counter</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600|instrument-sans:400,500,600" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="pearl-bg min-h-dvh text-ink antialiased">
<main x-data="knitCounter" x-cloak class="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">

    <header class="text-center">
        <h1 class="font-display text-3xl font-medium italic tracking-tight">Knit Counter</h1>
    </header>

    {{-- Project picker --}}
    <section class="flex flex-col gap-3">
        <div class="flex flex-wrap justify-center gap-2" x-show="state.projects.length">
            <template x-for="p in state.projects" :key="p.id">
                <button type="button" @click="select(p.id)"
                        class="rounded-full px-4 py-2 text-sm font-medium transition"
                        :class="p.id === state.currentId
                            ? 'pearl-sheen pearl-plus text-ink'
                            : 'pearl-minus'"
                        x-text="p.name"></button>
            </template>
        </div>

        <form @submit.prevent="add()" class="flex gap-2">
            <label for="new-project" class="sr-only">New project name</label>
            <input id="new-project" x-model="newName" type="text" placeholder="New project name"
                   class="pearl-input min-w-0 flex-1 rounded-2xl px-4 py-3 text-base placeholder:text-ink-soft/70">
            <button type="submit"
                    class="pearl-sheen pearl-plus rounded-2xl px-5 py-3 font-semibold">Add</button>
        </form>
    </section>

    {{-- Empty state --}}
    <p x-show="!current" class="mt-10 text-center font-display text-lg italic text-ink-soft">
        Add a project to start counting.
    </p>

    {{-- Current project --}}
    <section x-show="current" class="flex flex-col gap-4">
        <div x-show="!editing" class="flex items-center justify-between gap-3">
            <h2 class="truncate font-display text-2xl font-medium" x-text="current?.name"></h2>
            <div class="flex shrink-0 gap-1 text-sm text-ink-soft">
                <button type="button" @click="startRename()" class="rounded-full px-3 py-1.5 hover:bg-white/60">Rename</button>
                <button type="button" @click="remove()"
                        class="rounded-full px-3 py-1.5 transition"
                        :class="isArmed('delete') ? 'bg-[#b0567f] text-white' : 'hover:bg-white/60 hover:text-[#b0567f]'"
                        x-text="isArmed('delete') ? 'Tap to delete' : 'Delete'"></button>
            </div>
        </div>

        <form x-show="editing" @submit.prevent="saveRename()" class="flex gap-2">
            <label for="rename-project" class="sr-only">Project name</label>
            <input id="rename-project" x-ref="renameInput" x-model="editName" type="text"
                   @keydown.escape="cancelRename()"
                   class="pearl-input min-w-0 flex-1 rounded-2xl px-4 py-2.5 font-display text-xl">
            <button type="submit" class="pearl-sheen pearl-plus rounded-2xl px-4 font-semibold">Save</button>
            <button type="button" @click="cancelRename()" class="rounded-2xl px-3 text-sm text-ink-soft">Cancel</button>
        </form>

        @foreach (['rows' => 'Rows', 'stitches' => 'Stitches'] as $field => $label)
            <div class="pearl-card rounded-[2rem] p-5">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">{{ $label }}</h3>
                    <button type="button" @click="reset('{{ $field }}')"
                            class="rounded-full px-3 py-1 text-xs transition"
                            :class="isArmed('reset-{{ $field }}') ? 'bg-[#b0567f] text-white' : 'text-ink-soft hover:bg-white/70'"
                            x-text="isArmed('reset-{{ $field }}') ? 'Tap again to reset' : 'Reset'"></button>
                </div>
                <p class="pearl-number my-2 text-center text-7xl font-medium tabular-nums leading-none py-1"
                   aria-live="polite" x-text="current?.{{ $field }} ?? 0"></p>
                <div class="grid grid-cols-[1fr_2fr] gap-3">
                    <button type="button" @click="bump('{{ $field }}', -1)" aria-label="Minus one {{ strtolower($label) }}"
                            class="pearl-minus h-20 select-none rounded-3xl text-4xl font-light">−</button>
                    <button type="button" @click="bump('{{ $field }}', 1)" aria-label="Plus one {{ strtolower($label) }}"
                            class="pearl-sheen pearl-plus h-20 select-none rounded-3xl text-4xl font-light">+</button>
                </div>
            </div>
        @endforeach
    </section>

    <p class="mt-auto pt-6 text-center text-xs text-ink-soft/80">Saved on this device.</p>
</main>
</body>
</html>
