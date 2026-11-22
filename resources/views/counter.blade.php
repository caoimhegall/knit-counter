<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#ece8e7">
    <title>Purl Knit Counter</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=fraunces:400,500,400i,500i|dm-sans:400,500,600|bodoni-moda:400i,500i" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="pearl-bg min-h-dvh text-ink antialiased">
<main x-data="knitCounter" x-cloak class="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">

    <header class="text-center">
        <h1 class="font-title text-4xl font-normal italic tracking-tight text-title">Purl Knit Counter</h1>
    </header>

    {{-- Project picker --}}
    <section class="flex flex-col gap-3">
        <div class="flex flex-wrap justify-center gap-2">
            <template x-for="p in state.projects" :key="p.id">
                <button type="button" @click="select(p.id)"
                        class="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition"
                        :class="p.id === state.currentId ? 'pearl-sheen pearl-plus' : 'pearl-minus'"
                        :aria-pressed="p.id === state.currentId"
                        x-text="p.name"></button>
            </template>
            <button type="button" @click="newProject()"
                    class="pearl-minus rounded-full px-4 py-2 text-sm font-medium !text-[#6a6062]">+ New</button>
        </div>
    </section>

    {{-- Empty state --}}
    <p x-show="!current" class="mt-10 text-center font-title text-xl italic text-title">
        Tap + New to start a project.
    </p>

    {{-- Current project --}}
    <section x-show="current" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
            <h2 class="truncate font-title text-2xl font-normal italic text-title" x-text="current?.name"></h2>
            <div class="flex shrink-0 gap-1 text-sm text-ink-soft">
                <button type="button" @click="rename()" class="rounded-full px-3 py-1.5 hover:bg-white/60">Rename</button>
                <button type="button" @click="remove()" class="rounded-full px-3 py-1.5 hover:bg-white/60 hover:text-danger">Delete</button>
            </div>
        </div>

        {{-- Pattern strip --}}
        <button type="button" @click="openPattern()"
                class="pearl-minus flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left">
            <template x-if="currentStep">
                <span class="flex min-w-0 items-baseline gap-2">
                    <span class="shrink-0 text-xs font-semibold uppercase tracking-[0.2em]"
                          x-text="`Step ${currentStep.index + 1} of ${current.pattern.length}`"></span>
                    <span x-show="currentStep.step.side"
                          class="pearl-sheen shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-ink-soft"
                          x-text="currentStep.step.side"></span>
                    <span class="truncate font-display text-lg text-ink" x-text="currentStep.step.stitches"></span>
                </span>
            </template>
            <span x-show="!currentStep" class="text-sm">+ Add a stitch pattern</span>
            <span class="shrink-0 text-xs" x-show="currentStep">Edit</span>
        </button>

        @foreach (['rows' => 'Rows', 'stitches' => 'Stitches'] as $field => $label)
            <div class="pearl-card rounded-[2rem] {{ $field === 'rows' ? 'px-5 py-4' : 'p-5' }}">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">{{ $label }}</h3>
                    <button type="button" @click="reset('{{ $field }}')"
                            class="rounded-full px-3 py-1 text-xs text-ink-soft hover:bg-white/70">Reset</button>
                </div>

                @if ($field === 'stitches')
                    <div class="my-2 grid grid-cols-2 items-center py-1">
                        <div class="text-center" :class="next ? '' : 'col-span-2'">
                            <p class="pearl-number text-7xl font-medium tabular-nums leading-none"
                               aria-live="polite" x-text="current?.stitches ?? 0"></p>
                            <p x-show="current?.totalStitches" class="mt-1 text-sm"
                               :class="overTotal ? 'font-semibold text-danger' : 'text-ink-soft'"
                               x-text="`of ${current?.totalStitches}`"></p>
                        </div>
                        <div x-show="next" class="flex flex-col items-center" aria-live="polite">
                            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Next</span>
                            <span class="pearl-sheen pearl-plus pearl-next-letter mt-1 flex h-16 w-16 items-center justify-center rounded-full font-display text-5xl italic !text-ink-soft"
                                  :class="`pearl-next-${next}`"><span x-text="next"></span></span>
                            <span class="mt-1 text-xs text-ink-soft" x-text="next === 'k' ? 'knit' : 'purl'"></span>
                        </div>
                    </div>
                @else
                    {{-- Compact: rows are tapped once per row --}}
                    <div class="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <button type="button" @click="bump('rows', -1)" aria-label="Minus one rows"
                                class="pearl-minus h-14 select-none rounded-2xl text-3xl font-light">−</button>
                        <p class="pearl-number min-w-[3ch] text-center text-6xl font-medium tabular-nums leading-none"
                           aria-live="polite" x-text="current?.rows ?? 0"></p>
                        <button type="button" @click="bump('rows', 1)" aria-label="Plus one rows"
                                class="pearl-sheen pearl-plus h-14 select-none rounded-2xl text-3xl font-light">+</button>
                    </div>
                @endif

                @if ($field === 'stitches')
                    <div class="grid grid-cols-[1fr_2fr] gap-3">
                        <button type="button" @click="bump('stitches', -1)" aria-label="Minus one stitches"
                                class="pearl-minus h-20 select-none rounded-3xl text-4xl font-light">−</button>
                        <button type="button" @click="bump('stitches', 1)" aria-label="Plus one stitches"
                                class="pearl-sheen pearl-plus h-20 select-none rounded-3xl text-4xl font-light">+</button>
                    </div>
                @endif
            </div>
        @endforeach
    </section>

    <p class="mt-auto pt-6 text-center text-xs text-ink-soft/80">Saved on this device.</p>

    {{-- Pattern editor --}}
    <div x-show="editor.open" x-transition.opacity.duration.200ms
         @keydown.escape.window="editor.open && (editor.open = false)"
         class="fixed inset-0 z-40 flex items-end justify-center bg-[#4a4244]/25 p-4 backdrop-blur-sm sm:items-center"
         @click.self="editor.open = false">
        <form x-show="editor.open" @submit.prevent="savePattern()"
              x-transition:enter="transition ease-out duration-200"
              x-transition:enter-start="opacity-0 translate-y-4 scale-95"
              x-transition:enter-end="opacity-100 translate-y-0 scale-100"
              role="dialog" aria-modal="true" aria-labelledby="pattern-title"
              class="pearl-card flex max-h-[90dvh] w-full max-w-md flex-col rounded-[2rem] p-5">
            <h2 id="pattern-title" class="text-center font-title text-2xl font-normal italic text-title">Stitch pattern</h2>

            <div class="mt-4 -mx-1 flex flex-col gap-4 overflow-y-auto px-1">
                <label class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium">Stitches on needles</span>
                    <input type="number" inputmode="numeric" min="1" x-model="editor.total" placeholder="e.g. 40"
                           class="pearl-input w-28 rounded-xl px-3 py-2 text-center text-base">
                </label>

                <div class="flex flex-col gap-3">
                    <div class="flex items-baseline justify-between">
                        <span class="text-sm font-medium">Steps</span>
                        <span class="text-xs text-ink-soft">repeat from step 1</span>
                    </div>

                    <template x-for="(st, i) in editor.steps" :key="i">
                        <div class="rounded-2xl bg-white/60 p-3 ring-1 ring-hairline">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft"
                                      x-text="`Step ${i + 1}`"></span>
                                <div class="flex items-center gap-1">
                                    <template x-for="side in ['', 'RS', 'WS']" :key="side">
                                        <button type="button" @click="st.side = side"
                                                class="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                                                :class="st.side === side ? 'pearl-sheen text-ink ring-1 ring-[#e3d0ce]' : 'text-ink-soft'"
                                                x-text="side || '—'"
                                                :aria-pressed="st.side === side"
                                                :aria-label="side ? `Mark step ${i + 1} as ${side}` : `No side for step ${i + 1}`"></button>
                                    </template>
                                    <button type="button" @click="removeStep(i)" x-show="editor.steps.length > 1"
                                            class="ml-1 rounded-full px-2 py-1 text-ink-soft hover:text-danger"
                                            :aria-label="`Remove step ${i + 1}`">✕</button>
                                </div>
                            </div>
                            <div class="mt-2 flex items-center gap-2">
                                <input type="text" x-model="st.stitches" placeholder="k1 p1"
                                       autocapitalize="off" autocomplete="off" spellcheck="false"
                                       :aria-label="`Stitches for step ${i + 1}`"
                                       class="pearl-input min-w-0 flex-1 rounded-xl px-3 py-2 font-display text-lg"
                                       :class="stepInvalid(st) ? 'ring-2 ring-danger/60' : ''">
                                <span class="text-sm text-ink-soft">for</span>
                                <input type="number" inputmode="numeric" min="1" x-model.number="st.rows"
                                       :aria-label="`Rows for step ${i + 1}`"
                                       class="pearl-input w-14 rounded-xl px-2 py-2 text-center">
                                <span class="text-sm text-ink-soft" x-text="st.rows == 1 ? 'row' : 'rows'"></span>
                            </div>
                            <p x-show="stepInvalid(st)" class="mt-1 text-xs text-danger">
                                Use k and p with numbers, like k2 p2.
                            </p>
                        </div>
                    </template>

                    <button type="button" @click="addStep()"
                            class="rounded-2xl border-[1.5px] border-[#e3d3d1] py-2.5 text-sm text-ink-soft hover:bg-white/50">
                        + Add step
                    </button>
                </div>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3">
                <button type="button" @click="editor.open = false" class="pearl-minus h-14 rounded-2xl font-medium">Cancel</button>
                <button type="submit" :disabled="!editorValid"
                        class="pearl-sheen pearl-plus h-14 rounded-2xl font-semibold disabled:opacity-50">Save</button>
            </div>
        </form>
    </div>

    {{-- Pearl pop-up (Reset / Delete / Rename) --}}
    <div x-show="modal.open" x-transition.opacity.duration.200ms
         @keydown.escape.window="modal.open && closeModal()"
         class="fixed inset-0 z-50 flex items-end justify-center bg-[#4a4244]/25 p-4 backdrop-blur-sm sm:items-center"
         @click.self="closeModal()">
        <form x-show="modal.open"
              x-transition:enter="transition ease-out duration-200"
              x-transition:enter-start="opacity-0 translate-y-4 scale-95"
              x-transition:enter-end="opacity-100 translate-y-0 scale-100"
              @submit.prevent="confirmModal()"
              role="dialog" aria-modal="true" aria-labelledby="modal-title"
              class="pearl-card w-full max-w-sm rounded-[2rem] p-6 text-center">
            <h2 id="modal-title" class="font-title text-2xl font-normal italic text-title" x-text="modal.title"></h2>
            <p x-show="modal.message" class="mt-2 text-sm text-ink-soft" x-text="modal.message"></p>

            <template x-if="modal.withInput">
                <div class="mt-4 flex flex-col gap-2 text-left">
                    <label for="modal-input" class="text-sm font-medium" x-text="modal.label || 'Name'"></label>
                    <input id="modal-input" x-ref="modalInput" x-model="modal.value" type="text"
                           :placeholder="modal.placeholder"
                           class="pearl-input w-full rounded-2xl px-4 py-3 text-base placeholder:text-ink-soft/60">
                </div>
            </template>

            <div class="mt-6 grid grid-cols-2 gap-3">
                <button type="button" @click="closeModal()"
                        class="pearl-minus h-14 rounded-2xl font-medium">Cancel</button>
                <button type="submit" x-ref="modalConfirm"
                        class="pearl-plus h-14 rounded-2xl font-semibold"
                        :class="modal.danger ? 'pearl-danger' : 'pearl-sheen'"
                        x-text="modal.confirmLabel"></button>
            </div>
        </form>
    </div>
</main>
</body>
</html>
