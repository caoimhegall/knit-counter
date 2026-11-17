<?php

namespace Tests\Feature;

use Tests\TestCase;

class CounterPageTest extends TestCase
{
    public function test_home_page_shows_the_counter(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Knit Counter')
            ->assertSee('Rows')
            ->assertSee('Stitches')
            ->assertSee('x-data="knitCounter"', false);
    }
}
